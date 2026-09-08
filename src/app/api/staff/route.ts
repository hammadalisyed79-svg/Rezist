import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

function dayStart(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "staff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const users = await prisma.user.findMany({
    where:
      session.role === "HQ_ADMIN"
        ? { active: true }
        : { active: true, OR: [{ branchId: session.branchId || "" }, { role: "HQ_ADMIN" }] },
    include: { branch: true },
    orderBy: { name: "asc" },
  });

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: since },
      voided: false,
      ...(session.role === "HQ_ADMIN" ? {} : { branchId: session.branchId || undefined }),
    },
    select: { cashierId: true, total: true },
  });

  const perf = new Map<string, { count: number; total: number }>();
  for (const s of sales) {
    if (!s.cashierId) continue;
    const cur = perf.get(s.cashierId) || { count: 0, total: 0 };
    cur.count += 1;
    cur.total += s.total;
    perf.set(s.cashierId, cur);
  }

  const attendance = await prisma.attendance.findMany({
    where: {
      workDate: dayStart(),
      ...(session.role === "HQ_ADMIN" ? {} : { branchId: session.branchId || undefined }),
    },
    include: { user: true, branch: true },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      passwordHash: undefined,
      managerPinHash: u.managerPinHash ? true : false,
      performance: perf.get(u.id) || { count: 0, total: 0 },
    })),
    attendance,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const action = String(body.action || "checkIn");

  if (action === "checkIn" || action === "checkOut") {
    if (!can(session.role, "attendance")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!can(session.role, "staff")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "setPin") {
    if (session.role === "CASHIER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const targetId = String(body.userId || session.id);
    if (session.role !== "HQ_ADMIN" && targetId !== session.id) {
      return NextResponse.json({ error: "Can only set your own PIN" }, { status: 403 });
    }
    const pin = String(body.pin || "");
    if (pin.length < 4) {
      return NextResponse.json({ error: "PIN must be 4+ digits" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: targetId },
      data: { managerPinHash: await bcrypt.hash(pin, 10) },
    });
    await writeAudit({
      actor: session,
      action: "PIN_SET",
      entityType: "User",
      entityId: targetId,
      summary: "Manager PIN updated",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "checkIn" || action === "checkOut") {
    const branchId = session.branchId || String(body.branchId || "");
    if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
    const workDate = dayStart();
    const existing = await prisma.attendance.findUnique({
      where: { userId_workDate: { userId: session.id, workDate } },
    });

    if (action === "checkIn") {
      const row =
        existing ||
        (await prisma.attendance.create({
          data: {
            userId: session.id,
            branchId,
            workDate,
            checkIn: new Date(),
            status: new Date().getHours() >= 10 ? "LATE" : "PRESENT",
          },
        }));
      if (existing && !existing.checkIn) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: { checkIn: new Date() },
        });
      }
      return NextResponse.json({ attendance: row });
    }

    if (!existing) {
      return NextResponse.json({ error: "Check in first" }, { status: 400 });
    }
    const row = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOut: new Date() },
    });
    return NextResponse.json({ attendance: row });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

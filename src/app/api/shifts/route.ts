import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveBranchScope } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";
import { can } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "pos")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const branchId = resolveBranchScope(session, req.nextUrl.searchParams.get("branchId"));
  const open = await prisma.posShift.findMany({
    where: {
      status: "OPEN",
      ...(branchId ? { branchId } : session.role === "HQ_ADMIN" ? {} : { branchId: session.branchId || undefined }),
      ...(session.role === "CASHIER" ? { cashierId: session.id } : {}),
    },
    include: { cashier: true, branch: true },
    orderBy: { openedAt: "desc" },
  });
  return NextResponse.json({ shifts: open });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "pos")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const action = String(body.action || "open");

  try {
    if (action === "open") {
      const branchId = resolveBranchScope(session, body.branchId) || session.branchId;
      if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
      if (session.role !== "HQ_ADMIN" && session.branchId && session.branchId !== branchId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const tillNo = String(body.tillNo || "TILL-1");
      const existing = await prisma.posShift.findFirst({
        where: { branchId, tillNo, status: "OPEN" },
      });
      if (existing && existing.cashierId !== session.id && session.role === "CASHIER") {
        return NextResponse.json(
          { error: `${tillNo} already open by another cashier` },
          { status: 400 }
        );
      }
      if (existing && existing.cashierId === session.id) {
        return NextResponse.json({ shift: existing });
      }

      const shift = await prisma.posShift.create({
        data: {
          branchId,
          tillNo,
          cashierId: session.id,
          openingCash: Number(body.openingCash || 0),
          notes: body.notes || null,
        },
        include: { branch: true, cashier: true },
      });

      await writeAudit({
        actor: session,
        action: "SHIFT_OPEN",
        entityType: "PosShift",
        entityId: shift.id,
        branchId,
        summary: `Opened ${tillNo} at branch`,
      });

      return NextResponse.json({ shift }, { status: 201 });
    }

    if (action === "close") {
      const shift = await prisma.posShift.findUnique({ where: { id: String(body.shiftId) } });
      if (!shift || shift.status !== "OPEN") {
        return NextResponse.json({ error: "Shift not open" }, { status: 400 });
      }
      if (
        session.role === "CASHIER" &&
        shift.cashierId !== session.id
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const updated = await prisma.posShift.update({
        where: { id: shift.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closingCash: Number(body.closingCash || 0),
          notes: body.notes || shift.notes,
        },
      });

      await writeAudit({
        actor: session,
        action: "SHIFT_CLOSE",
        entityType: "PosShift",
        entityId: shift.id,
        branchId: shift.branchId,
        summary: `Closed ${shift.tillNo}`,
      });

      return NextResponse.json({ shift: updated });
    }

    if (action === "verifyPin") {
      const pin = String(body.pin || "");
      const managers = await prisma.user.findMany({
        where: {
          active: true,
          role: { in: ["HQ_ADMIN", "BRANCH_MANAGER"] },
          managerPinHash: { not: null },
          ...(session.branchId
            ? { OR: [{ role: "HQ_ADMIN" }, { branchId: session.branchId }] }
            : {}),
        },
      });
      for (const m of managers) {
        if (m.managerPinHash && (await bcrypt.compare(pin, m.managerPinHash))) {
          return NextResponse.json({ ok: true, managerId: m.id, managerName: m.name });
        }
      }
      return NextResponse.json({ error: "Invalid manager PIN" }, { status: 403 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Shift failed" },
      { status: 400 }
    );
  }
}

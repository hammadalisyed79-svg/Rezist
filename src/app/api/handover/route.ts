import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, assertBranchAccess } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "handover")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const branchId =
    session.role === "HQ_ADMIN"
      ? req.nextUrl.searchParams.get("branchId")
      : session.branchId;
  const handovers = await prisma.shiftHandover.findMany({
    where: branchId ? { branchId } : undefined,
    include: { branch: true, fromUser: true, toUser: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ handovers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "handover")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const action = String(body.action || "create");

  if (action === "accept") {
    const handover = await prisma.shiftHandover.update({
      where: { id: String(body.id) },
      data: {
        status: "ACCEPTED",
        closedAt: new Date(),
        toUserId: body.toUserId || session.id,
      },
    });
    await writeAudit({
      actor: session,
      action: "HANDOVER_ACCEPT",
      entityType: "ShiftHandover",
      entityId: handover.id,
      branchId: handover.branchId,
      summary: `Accepted handover variance ${handover.variance}`,
    });
    return NextResponse.json({ handover });
  }

  const branchId = String(body.branchId || session.branchId || "");
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
  try {
    assertBranchAccess(session, branchId);
  } catch {
    return NextResponse.json({ error: "Forbidden branch" }, { status: 403 });
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const shiftId = body.shiftId ? String(body.shiftId) : null;
  const shift = shiftId
    ? await prisma.posShift.findUnique({ where: { id: shiftId } })
    : await prisma.posShift.findFirst({
        where: { branchId, cashierId: session.id, status: "OPEN" },
      });

  const sales = await prisma.sale.findMany({
    where: {
      branchId,
      voided: false,
      createdAt: { gte: dayStart },
      ...(shift ? { shiftId: shift.id } : {}),
    },
  });
  const cashSales = sales
    .filter((s) => s.paymentMethod === "CASH")
    .reduce((a, s) => a + s.total, 0);
  const opening = shift?.openingCash || 0;
  const expectedCash = opening + cashSales;
  const countedCash = Number(body.countedCash || 0);
  const variance = countedCash - expectedCash;

  const wastageQty = (
    await prisma.wastageRecord.aggregate({
      where: { branchId, createdAt: { gte: dayStart } },
      _sum: { quantity: true },
    })
  )._sum.quantity || 0;

  const openOrders = await prisma.onlineOrder.count({
    where: {
      branchId,
      status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
    },
  });

  const handover = await prisma.shiftHandover.create({
    data: {
      branchId,
      fromUserId: session.id,
      toUserId: body.toUserId ? String(body.toUserId) : null,
      shiftId: shift?.id || null,
      tillNo: shift?.tillNo || null,
      expectedCash,
      countedCash,
      variance,
      salesTotal: sales.reduce((a, s) => a + s.total, 0),
      saleCount: sales.length,
      wastageQty,
      openOrders,
      notes: body.notes ? String(body.notes) : null,
      status: "OPEN",
    },
    include: { branch: true, fromUser: true, toUser: true },
  });

  await writeAudit({
    actor: session,
    action: "HANDOVER_CREATE",
    entityType: "ShiftHandover",
    entityId: handover.id,
    branchId,
    summary: `Handover ${handover.tillNo || "till"} · var ${variance}`,
  });

  return NextResponse.json({ handover }, { status: 201 });
}

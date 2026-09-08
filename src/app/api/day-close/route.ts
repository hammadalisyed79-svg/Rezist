import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveBranchScope } from "@/lib/utils";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function daySummary(branchId: string) {
  const day = startOfDay();
  const sales = await prisma.sale.findMany({
    where: { branchId, createdAt: { gte: day }, channel: "POS", voided: false },
  });
  const cashExpected = sales
    .filter((s) => s.paymentMethod === "CASH")
    .reduce((a, s) => a + s.total, 0);
  const cardTotal = sales
    .filter((s) => s.paymentMethod !== "CASH")
    .reduce((a, s) => a + s.total, 0);
  const saleTotal = sales.reduce((a, s) => a + s.total, 0);
  const existing = await prisma.dayClose.findUnique({
    where: { branchId_businessDate: { branchId, businessDate: day } },
  });
  return {
    businessDate: day,
    saleCount: sales.length,
    saleTotal,
    cashExpected,
    cardTotal,
    closed: !!existing,
    dayClose: existing,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "dayClose")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const branchId = resolveBranchScope(session, req.nextUrl.searchParams.get("branchId"));
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });

  return NextResponse.json({ summary: await daySummary(branchId) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "dayClose")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const branchId = resolveBranchScope(session, body.branchId);
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });

  const summary = await daySummary(branchId);
  const cashCounted = Number(body.cashCounted || 0);

  try {
    const dayClose = await prisma.dayClose.create({
      data: {
        branchId,
        closedById: session.id,
        businessDate: summary.businessDate,
        cashExpected: summary.cashExpected,
        cashCounted,
        cardTotal: summary.cardTotal,
        saleCount: summary.saleCount,
        saleTotal: summary.saleTotal,
        variance: cashCounted - summary.cashExpected,
        notes: body.notes || null,
      },
    });

    await writeAudit({
      actor: session,
      action: "DAY_CLOSE",
      entityType: "DayClose",
      entityId: dayClose.id,
      branchId,
      summary: `Day close variance ${dayClose.variance}`,
      meta: {
        cashExpected: summary.cashExpected,
        cashCounted,
        saleTotal: summary.saleTotal,
      },
    });

    return NextResponse.json({ dayClose }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Day already closed" }, { status: 400 });
  }
}

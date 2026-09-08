import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveBranchScope } from "@/lib/utils";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const branchId = resolveBranchScope(session, req.nextUrl.searchParams.get("branchId"));
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });

  const day = startOfDay();
  const sales = await prisma.sale.findMany({
    where: { branchId, createdAt: { gte: day }, channel: "POS" },
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

  return NextResponse.json({
    summary: {
      businessDate: day,
      saleCount: sales.length,
      saleTotal,
      cashExpected,
      cardTotal,
      closed: !!existing,
      dayClose: existing,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "CASHIER") {
    // cashiers can close if assigned; allow managers+HQ and cashiers for their branch
  }
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const branchId = resolveBranchScope(session, body.branchId);
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });

  const day = startOfDay();
  const sales = await prisma.sale.findMany({
    where: { branchId, createdAt: { gte: day }, channel: "POS" },
  });
  const cashExpected = sales
    .filter((s) => s.paymentMethod === "CASH")
    .reduce((a, s) => a + s.total, 0);
  const cardTotal = sales
    .filter((s) => s.paymentMethod !== "CASH")
    .reduce((a, s) => a + s.total, 0);
  const saleTotal = sales.reduce((a, s) => a + s.total, 0);
  const cashCounted = Number(body.cashCounted || 0);

  try {
    const dayClose = await prisma.dayClose.create({
      data: {
        branchId,
        closedById: session.id,
        businessDate: day,
        cashExpected,
        cashCounted,
        cardTotal,
        saleCount: sales.length,
        saleTotal,
        variance: cashCounted - cashExpected,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ dayClose }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Day already closed" }, { status: 400 });
  }
}

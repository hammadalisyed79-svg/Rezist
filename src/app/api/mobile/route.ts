import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";

async function authMobile(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const row = await prisma.mobileApiToken.findFirst({
    where: { token, active: true },
  });
  if (!row) return null;
  await prisma.mobileApiToken.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });
  return row;
}

export async function GET(req: NextRequest) {
  const token = await authMobile(req);
  if (!token) {
    return NextResponse.json(
      { error: "Bearer token required", hint: "Create a token from ERP → Mobile API" },
      { status: 401 }
    );
  }

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const branchFilter = token.branchId ? { branchId: token.branchId } : {};

  const [sales, orders, lowStock, branches] = await Promise.all([
    prisma.sale.findMany({
      where: { ...branchFilter, createdAt: { gte: since }, voided: false },
      select: { total: true, branchId: true, paymentMethod: true },
    }),
    prisma.onlineOrder.findMany({
      where: {
        ...branchFilter,
        status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
      },
      include: { branch: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.inventoryItem.findMany({
      where: {
        ...(token.branchId ? { branchId: token.branchId } : {}),
        product: { trackStock: true },
      },
      include: { product: true, branch: true },
      take: 200,
    }),
    prisma.branch.findMany({
      where: { active: true, type: "RETAIL" },
      select: { id: true, name: true, city: true, code: true },
    }),
  ]);

  const revenue = sales.reduce((a, s) => a + s.total, 0);
  const alerts = lowStock
    .filter((i) => i.quantity - (i.reservedQty || 0) <= i.reorderLevel)
    .slice(0, 20)
    .map((i) => ({
      branch: i.branch.name,
      product: i.product.name,
      qty: i.quantity,
      reorderLevel: i.reorderLevel,
    }));

  return NextResponse.json({
    asOf: new Date().toISOString(),
    role: token.role,
    branchId: token.branchId,
    kpis: {
      todayRevenue: revenue,
      todayTxns: sales.length,
      openOrders: orders.length,
      lowStockCount: alerts.length,
    },
    openOrders: orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      branch: o.branch.name,
      customer: o.customerName,
      phone: o.customerPhone,
      total: o.total,
      channel: o.externalChannel,
    })),
    lowStock: alerts,
    branches,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.action === "mint") {
    // Session-based mint from ERP
    const { getSession } = await import("@/lib/auth");
    const { can } = await import("@/lib/permissions");
    const session = await getSession();
    if (!session || !can(session.role, "mobileApi")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const raw = randomBytes(24).toString("hex");
    const token = createHash("sha256").update(raw).digest("hex").slice(0, 48);
    const row = await prisma.mobileApiToken.create({
      data: {
        token,
        label: String(body.label || `Manager ${session.name}`),
        role: session.role === "HQ_ADMIN" ? "HQ_ADMIN" : "BRANCH_MANAGER",
        branchId: session.role === "HQ_ADMIN" ? body.branchId || null : session.branchId,
      },
    });
    return NextResponse.json({
      token: row.token,
      id: row.id,
      label: row.label,
      note: "Store this bearer token for manager mobile / integrations",
    });
  }

  const token = await authMobile(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (body.action === "orderStatus") {
    const order = await prisma.onlineOrder.update({
      where: { id: String(body.orderId) },
      data: { status: String(body.status) },
    });
    return NextResponse.json({ order: { id: order.id, status: order.status } });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

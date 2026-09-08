import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "HQ_ADMIN" && session.role !== "BRANCH_MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const days = Number(req.nextUrl.searchParams.get("days") || 7);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const branchFilter =
    session.role === "HQ_ADMIN" ? undefined : { branchId: session.branchId || undefined };

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: since }, ...branchFilter },
    include: { branch: true, lines: true },
  });

  const byBranchMap = new Map<string, { branch: string; city: string; total: number; count: number }>();
  for (const sale of sales) {
    const key = sale.branchId;
    const cur = byBranchMap.get(key) || {
      branch: sale.branch.name,
      city: sale.branch.city,
      total: 0,
      count: 0,
    };
    cur.total += sale.total;
    cur.count += 1;
    byBranchMap.set(key, cur);
  }

  const productTotals = new Map<string, { productId: string; qty: number; revenue: number }>();
  for (const sale of sales) {
    for (const line of sale.lines) {
      const cur = productTotals.get(line.productId) || {
        productId: line.productId,
        qty: 0,
        revenue: 0,
      };
      cur.qty += line.quantity;
      cur.revenue += line.lineTotal;
      productTotals.set(line.productId, cur);
    }
  }

  const productIds = [...productTotals.keys()];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productName = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const topSkus = [...productTotals.values()]
    .map((p) => ({
      name: productName[p.productId] || p.productId,
      qty: p.qty,
      revenue: p.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const wastage = await prisma.wastageRecord.findMany({
    where: { createdAt: { gte: since }, ...branchFilter },
    include: { product: true, branch: true },
  });

  const lowStock = await prisma.inventoryItem.findMany({
    where: {
      ...(session.role === "HQ_ADMIN" ? {} : { branchId: session.branchId || undefined }),
      product: { trackStock: true },
    },
    include: { product: true, branch: true },
  });

  const stockouts = lowStock.filter((i) => i.quantity <= i.reorderLevel);

  return NextResponse.json({
    periodDays: days,
    salesByBranch: [...byBranchMap.values()].sort((a, b) => b.total - a.total),
    topSkus,
    wastageTotalQty: wastage.reduce((a, w) => a + w.quantity, 0),
    wastageRecords: wastage.slice(0, 20),
    lowStock: stockouts.slice(0, 30),
    saleCount: sales.length,
    saleTotal: sales.reduce((a, s) => a + s.total, 0),
  });
}

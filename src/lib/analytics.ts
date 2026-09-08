import { prisma } from "./prisma";

export async function buildAnalytics(opts: {
  days: number;
  branchId?: string | null;
}) {
  const days = Math.min(90, Math.max(1, opts.days || 14));
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const branchFilter = opts.branchId ? { branchId: opts.branchId } : {};

  const [sales, wastage, orders] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: since }, voided: false, ...branchFilter },
      include: { branch: true, lines: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.wastageRecord.findMany({
      where: { createdAt: { gte: since }, ...branchFilter },
      include: { product: true, branch: true },
    }),
    prisma.onlineOrder.findMany({
      where: { createdAt: { gte: since }, ...branchFilter },
      select: { status: true, total: true, fulfillment: true, externalChannel: true },
    }),
  ]);

  const dailyMap = new Map<string, { date: string; sales: number; txns: number; wastage: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, sales: 0, txns: 0, wastage: 0 });
  }
  for (const s of sales) {
    const key = s.createdAt.toISOString().slice(0, 10);
    const cur = dailyMap.get(key) || { date: key, sales: 0, txns: 0, wastage: 0 };
    cur.sales += s.total;
    cur.txns += 1;
    dailyMap.set(key, cur);
  }
  for (const w of wastage) {
    const key = w.createdAt.toISOString().slice(0, 10);
    const cur = dailyMap.get(key) || { date: key, sales: 0, txns: 0, wastage: 0 };
    cur.wastage += w.quantity;
    dailyMap.set(key, cur);
  }

  const byBranch = new Map<
    string,
    { branchId: string; name: string; city: string; sales: number; txns: number; avgTicket: number }
  >();
  for (const s of sales) {
    const cur = byBranch.get(s.branchId) || {
      branchId: s.branchId,
      name: s.branch.name,
      city: s.branch.city,
      sales: 0,
      txns: 0,
      avgTicket: 0,
    };
    cur.sales += s.total;
    cur.txns += 1;
    byBranch.set(s.branchId, cur);
  }
  for (const b of byBranch.values()) {
    b.avgTicket = b.txns ? b.sales / b.txns : 0;
  }

  const productMap = new Map<string, { productId: string; qty: number; revenue: number }>();
  for (const s of sales) {
    for (const l of s.lines) {
      const cur = productMap.get(l.productId) || { productId: l.productId, qty: 0, revenue: 0 };
      cur.qty += l.quantity;
      cur.revenue += l.lineTotal;
      productMap.set(l.productId, cur);
    }
  }
  const products = await prisma.product.findMany({
    where: { id: { in: [...productMap.keys()] } },
  });
  const names = Object.fromEntries(products.map((p) => [p.id, p.name]));
  const topSkus = [...productMap.values()]
    .map((p) => ({ name: names[p.productId] || p.productId, ...p }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12);

  const saleTotal = sales.reduce((a, s) => a + s.total, 0);
  const loyaltyRedeemed = sales.reduce((a, s) => a + (s.loyaltyRedeemed || 0), 0);
  const discountTotal = sales.reduce((a, s) => a + (s.discount || 0), 0);
  const wastageQty = wastage.reduce((a, w) => a + w.quantity, 0);

  const channelMix = {
    pos: sales.filter((s) => s.channel === "POS" || s.channel === "POS_OFFLINE").length,
    web: orders.filter((o) => o.externalChannel === "WEB").length,
    marketplace: orders.filter((o) =>
      ["FOODPANDA", "CAREEM", "MANUAL"].includes(o.externalChannel || "")
    ).length,
  };

  return {
    days,
    since: since.toISOString(),
    saleTotal,
    saleCount: sales.length,
    avgTicket: sales.length ? saleTotal / sales.length : 0,
    loyaltyRedeemed,
    discountTotal,
    wastageQty,
    daily: [...dailyMap.values()],
    byBranch: [...byBranch.values()].sort((a, b) => b.sales - a.sales),
    topSkus,
    channelMix,
    onlineOpen: orders.filter((o) =>
      ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(o.status)
    ).length,
  };
}

export function analyticsToCsv(data: Awaited<ReturnType<typeof buildAnalytics>>) {
  const lines = [
    "section,key,value",
    `summary,saleTotal,${data.saleTotal}`,
    `summary,saleCount,${data.saleCount}`,
    `summary,avgTicket,${data.avgTicket.toFixed(2)}`,
    `summary,wastageQty,${data.wastageQty}`,
    `summary,loyaltyRedeemed,${data.loyaltyRedeemed}`,
    ...data.daily.map((d) => `daily,${d.date},${d.sales}`),
    ...data.byBranch.map((b) => `branch,${b.name.replace(/,/g, " ")},${b.sales}`),
    ...data.topSkus.map((s) => `sku,${s.name.replace(/,/g, " ")},${s.revenue}`),
  ];
  return lines.join("\n");
}

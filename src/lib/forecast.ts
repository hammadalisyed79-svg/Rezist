import { prisma } from "./prisma";

export type ForecastRow = {
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku: string;
  avgDailyQty: number;
  trendPct: number;
  suggestedBakeQty: number;
  onHand: number;
  gap: number;
};

/**
 * Simple demand forecast: 14-day moving average with recent 7-day trend,
 * then suggest bake qty for tomorrow (+15% buffer for weekends).
 */
export async function buildDemandForecast(opts?: {
  lookbackDays?: number;
  branchId?: string | null;
}): Promise<ForecastRow[]> {
  const lookback = opts?.lookbackDays ?? 14;
  const since = new Date();
  since.setDate(since.getDate() - lookback);
  const mid = new Date();
  mid.setDate(mid.getDate() - Math.floor(lookback / 2));

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: since },
      voided: false,
      ...(opts?.branchId ? { branchId: opts.branchId } : {}),
      branch: { type: "RETAIL" },
    },
    include: {
      branch: true,
      lines: { include: { product: true } },
    },
  });

  type Acc = {
    branchId: string;
    branchName: string;
    productId: string;
    productName: string;
    sku: string;
    earlyQty: number;
    lateQty: number;
    totalQty: number;
  };
  const map = new Map<string, Acc>();

  for (const sale of sales) {
    for (const line of sale.lines) {
      if (line.product.type !== "FINISHED" || !line.product.trackStock) continue;
      const key = `${sale.branchId}:${line.productId}`;
      const cur = map.get(key) || {
        branchId: sale.branchId,
        branchName: sale.branch.name,
        productId: line.productId,
        productName: line.product.name,
        sku: line.product.sku,
        earlyQty: 0,
        lateQty: 0,
        totalQty: 0,
      };
      cur.totalQty += line.quantity;
      if (sale.createdAt < mid) cur.earlyQty += line.quantity;
      else cur.lateQty += line.quantity;
      map.set(key, cur);
    }
  }

  const halfDays = Math.max(1, lookback / 2);
  const isWeekend = [0, 6].includes(new Date().getDay());
  const buffer = isWeekend ? 1.2 : 1.15;

  const inventory = await prisma.inventoryItem.findMany({
    where: {
      ...(opts?.branchId ? { branchId: opts.branchId } : {}),
      product: { type: "FINISHED", trackStock: true },
    },
  });
  const onHandMap = new Map(inventory.map((i) => [`${i.branchId}:${i.productId}`, i.quantity]));

  const rows: ForecastRow[] = [];
  for (const acc of map.values()) {
    const avgDailyQty = acc.totalQty / lookback;
    const earlyAvg = acc.earlyQty / halfDays;
    const lateAvg = acc.lateQty / halfDays;
    const trendPct = earlyAvg > 0 ? ((lateAvg - earlyAvg) / earlyAvg) * 100 : lateAvg > 0 ? 100 : 0;
    const projected = avgDailyQty * (1 + Math.min(0.5, Math.max(-0.3, trendPct / 100)));
    const suggestedBakeQty = Math.max(0, Math.ceil(projected * buffer));
    const onHand = onHandMap.get(`${acc.branchId}:${acc.productId}`) || 0;
    rows.push({
      branchId: acc.branchId,
      branchName: acc.branchName,
      productId: acc.productId,
      productName: acc.productName,
      sku: acc.sku,
      avgDailyQty: Math.round(avgDailyQty * 10) / 10,
      trendPct: Math.round(trendPct),
      suggestedBakeQty,
      onHand,
      gap: Math.max(0, suggestedBakeQty - onHand),
    });
  }

  return rows.sort((a, b) => b.gap - a.gap || b.avgDailyQty - a.avgDailyQty);
}

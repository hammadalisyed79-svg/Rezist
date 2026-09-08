import { prisma } from "./prisma";

export type SupplierScore = {
  supplierId: string;
  code: string;
  name: string;
  city: string | null;
  poCount: number;
  receivedCount: number;
  onTimePct: number;
  fillRatePct: number;
  totalSpend: number;
  avgLeadDays: number;
  score: number;
};

/** Supplier purchase performance from POs / GRN variance. */
export async function buildSupplierScorecards(days = 90): Promise<SupplierScore[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const suppliers = await prisma.supplier.findMany({
    where: { active: true },
    include: {
      purchases: {
        where: { orderedAt: { gte: since } },
        include: { lines: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return suppliers.map((s) => {
    const pos = s.purchases;
    const received = pos.filter((p) => p.status === "RECEIVED" || p.receivedAt);
    let orderedQty = 0;
    let receivedQty = 0;
    let leadSum = 0;
    let leadN = 0;
    let onTime = 0;

    for (const po of pos) {
      for (const line of po.lines) {
        orderedQty += line.quantity;
        receivedQty += line.receivedQty;
      }
      if (po.receivedAt) {
        const lead = (po.receivedAt.getTime() - po.orderedAt.getTime()) / 86400000;
        leadSum += lead;
        leadN += 1;
        // "On time" heuristic: received within 5 days of order
        if (lead <= 5) onTime += 1;
      }
    }

    const poCount = pos.length;
    const receivedCount = received.length;
    const onTimePct = receivedCount ? (onTime / receivedCount) * 100 : 0;
    const fillRatePct = orderedQty > 0 ? (receivedQty / orderedQty) * 100 : 0;
    const totalSpend = pos.reduce((a, p) => a + p.total, 0);
    const avgLeadDays = leadN ? leadSum / leadN : 0;

    const score = Math.round(
      Math.min(100, onTimePct * 0.4 + Math.min(100, fillRatePct) * 0.4 + (poCount > 0 ? 20 : 0))
    );

    return {
      supplierId: s.id,
      code: s.code,
      name: s.name,
      city: s.city,
      poCount,
      receivedCount,
      onTimePct: Math.round(onTimePct),
      fillRatePct: Math.round(fillRatePct),
      totalSpend,
      avgLeadDays: Math.round(avgLeadDays * 10) / 10,
      score,
    };
  }).sort((a, b) => b.score - a.score || b.totalSpend - a.totalSpend);
}

import { prisma } from "./prisma";

export type BranchScore = {
  branchId: string;
  name: string;
  city: string;
  sales: number;
  txns: number;
  avgTicket: number;
  wastageQty: number;
  wastageCost: number;
  openOrders: number;
  lowStock: number;
  overdueTransfers: number;
  score: number; // 0–100 composite
};

/** Multi-branch company-owned ops scoreboard for HQ. */
export async function buildBranchScoreboard(days = 7): Promise<BranchScore[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const overdueCutoff = new Date();
  overdueCutoff.setDate(overdueCutoff.getDate() - 2);

  const branches = await prisma.branch.findMany({
    where: { active: true, type: "RETAIL" },
    orderBy: { name: "asc" },
  });

  const [sales, wastage, orders, inventory, transfers] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: since }, voided: false, branch: { type: "RETAIL" } },
      select: { branchId: true, total: true },
    }),
    prisma.wastageRecord.findMany({
      where: { createdAt: { gte: since } },
      select: { branchId: true, quantity: true, costTotal: true },
    }),
    prisma.onlineOrder.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] } },
      select: { branchId: true },
    }),
    prisma.inventoryItem.findMany({
      where: { product: { trackStock: true }, branch: { type: "RETAIL" } },
      select: { branchId: true, quantity: true, reorderLevel: true, reservedQty: true },
    }),
    prisma.stockTransfer.findMany({
      where: {
        status: "SHIPPED",
        createdAt: { lte: overdueCutoff },
      },
      select: { toBranchId: true },
    }),
  ]);

  const maxSales = Math.max(1, ...branches.map((b) =>
    sales.filter((s) => s.branchId === b.id).reduce((a, s) => a + s.total, 0)
  ));

  return branches.map((b) => {
    const branchSales = sales.filter((s) => s.branchId === b.id);
    const salesTotal = branchSales.reduce((a, s) => a + s.total, 0);
    const txns = branchSales.length;
    const wastageRows = wastage.filter((w) => w.branchId === b.id);
    const wastageQty = wastageRows.reduce((a, w) => a + w.quantity, 0);
    const wastageCost = wastageRows.reduce((a, w) => a + (w.costTotal || 0), 0);
    const openOrders = orders.filter((o) => o.branchId === b.id).length;
    const lowStock = inventory.filter(
      (i) => i.branchId === b.id && i.quantity - (i.reservedQty || 0) <= i.reorderLevel
    ).length;
    const overdueTransfers = transfers.filter((t) => t.toBranchId === b.id).length;

    // Composite: sales health − waste/stock penalties
    const salesScore = (salesTotal / maxSales) * 60;
    const wastePenalty = Math.min(20, wastageQty * 2 + wastageCost / 500);
    const stockPenalty = Math.min(15, lowStock * 3 + overdueTransfers * 4);
    const orderPenalty = Math.min(5, openOrders);
    const score = Math.max(0, Math.round(salesScore + 40 - wastePenalty - stockPenalty - orderPenalty));

    return {
      branchId: b.id,
      name: b.name,
      city: b.city,
      sales: salesTotal,
      txns,
      avgTicket: txns ? salesTotal / txns : 0,
      wastageQty,
      wastageCost,
      openOrders,
      lowStock,
      overdueTransfers,
      score,
    };
  }).sort((a, b) => b.score - a.score || b.sales - a.sales);
}

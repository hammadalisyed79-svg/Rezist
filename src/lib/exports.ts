import { buildBranchScoreboard } from "./scoreboard";
import { buildSupplierScorecards } from "./suppliers";
import { prisma } from "./prisma";

export async function buildExportPack(reportType: string, days = 7) {
  if (reportType === "SCOREBOARD") {
    const rows = await buildBranchScoreboard(days);
    const csv = [
      "branch,city,score,sales,txns,avgTicket,wastageQty,wastageCost,lowStock,overdueTransfers,openOrders",
      ...rows.map((r) =>
        [
          r.name,
          r.city,
          r.score,
          r.sales,
          r.txns,
          r.avgTicket.toFixed(2),
          r.wastageQty,
          r.wastageCost,
          r.lowStock,
          r.overdueTransfers,
          r.openOrders,
        ]
          .map((v) => String(v).replace(/,/g, " "))
          .join(",")
      ),
    ].join("\n");
    return { filename: `rezist-scoreboard-${days}d.csv`, csv };
  }

  if (reportType === "SUPPLIERS") {
    const rows = await buildSupplierScorecards(Math.max(days, 30));
    const csv = [
      "supplier,code,city,score,poCount,received,onTimePct,fillRatePct,spend,avgLeadDays",
      ...rows.map((r) =>
        [
          r.name,
          r.code,
          r.city || "",
          r.score,
          r.poCount,
          r.receivedCount,
          r.onTimePct,
          r.fillRatePct,
          r.totalSpend,
          r.avgLeadDays,
        ]
          .map((v) => String(v).replace(/,/g, " "))
          .join(",")
      ),
    ].join("\n");
    return { filename: `rezist-suppliers.csv`, csv };
  }

  if (reportType === "WASTAGE") {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const rows = await prisma.wastageRecord.findMany({
      where: { createdAt: { gte: since } },
      include: { product: true, branch: true },
      orderBy: { createdAt: "desc" },
    });
    const csv = [
      "date,branch,product,qty,category,reason,cost",
      ...rows.map((r) =>
        [
          r.createdAt.toISOString(),
          r.branch.name,
          r.product.name,
          r.quantity,
          r.category,
          r.reason,
          r.costTotal,
        ]
          .map((v) => String(v).replace(/,/g, " "))
          .join(",")
      ),
    ].join("\n");
    return { filename: `rezist-wastage-${days}d.csv`, csv };
  }

  if (reportType === "HANDOVER") {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const rows = await prisma.shiftHandover.findMany({
      where: { createdAt: { gte: since } },
      include: { branch: true, fromUser: true, toUser: true },
      orderBy: { createdAt: "desc" },
    });
    const csv = [
      "date,branch,from,to,till,expected,counted,variance,sales,status",
      ...rows.map((r) =>
        [
          r.createdAt.toISOString(),
          r.branch.name,
          r.fromUser.name,
          r.toUser?.name || "",
          r.tillNo || "",
          r.expectedCash,
          r.countedCash,
          r.variance,
          r.salesTotal,
          r.status,
        ]
          .map((v) => String(v).replace(/,/g, " "))
          .join(",")
      ),
    ].join("\n");
    return { filename: `rezist-handover-${days}d.csv`, csv };
  }

  // SALES default
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: since }, voided: false },
    include: { branch: true },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });
  const csv = [
    "date,saleNo,branch,channel,total,payment,loyaltyRedeemed",
    ...sales.map((s) =>
      [
        s.createdAt.toISOString(),
        s.saleNo,
        s.branch.name,
        s.channel,
        s.total,
        s.paymentMethod,
        s.loyaltyRedeemed,
      ]
        .map((v) => String(v).replace(/,/g, " "))
        .join(",")
    ),
  ].join("\n");
  return { filename: `rezist-sales-${days}d.csv`, csv };
}

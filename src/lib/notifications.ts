import { prisma } from "./prisma";
import { buildReorderSuggestions } from "./reorder";

/** Refresh ops notifications from live inventory / transfers / quality. */
export async function refreshOpsNotifications() {
  const overdueCutoff = new Date();
  overdueCutoff.setDate(overdueCutoff.getDate() - 2);
  const since = new Date();
  since.setHours(since.getHours() - 24);

  // Clear unread auto-generated alerts older than refresh window type-keys we rebuild
  const autoTypes = ["LOW_STOCK", "OVERDUE_TRANSFER", "QUALITY_FAIL"];
  await prisma.opsNotification.deleteMany({
    where: {
      type: { in: autoTypes },
      readAt: null,
      createdAt: { lt: since },
    },
  });

  const existing = await prisma.opsNotification.findMany({
    where: { type: { in: autoTypes }, readAt: null },
    select: { type: true, entityId: true },
  });
  const key = (t: string, id: string | null | undefined) => `${t}:${id || ""}`;
  const have = new Set(existing.map((e) => key(e.type, e.entityId)));

  const created: string[] = [];

  const reorders = await buildReorderSuggestions();
  for (const r of reorders.slice(0, 25)) {
    const entityId = `${r.branchId}:${r.productId}`;
    if (have.has(key("LOW_STOCK", entityId))) continue;
    await prisma.opsNotification.create({
      data: {
        branchId: r.branchId,
        severity: r.quantity <= 0 ? "CRITICAL" : "WARN",
        type: "LOW_STOCK",
        title: `Low stock · ${r.productName}`,
        body: `${r.branchName}: ${r.quantity} on hand (reorder ${r.reorderLevel}). Suggest ${r.action}.`,
        entityType: "InventoryItem",
        entityId,
      },
    });
    created.push("LOW_STOCK");
  }

  const overdue = await prisma.stockTransfer.findMany({
    where: { status: "SHIPPED", createdAt: { lte: overdueCutoff } },
    include: { fromBranch: true, toBranch: true },
    take: 20,
  });
  for (const t of overdue) {
    if (have.has(key("OVERDUE_TRANSFER", t.id))) continue;
    await prisma.opsNotification.create({
      data: {
        branchId: t.toBranchId,
        severity: "CRITICAL",
        type: "OVERDUE_TRANSFER",
        title: `Overdue transfer ${t.transferNo}`,
        body: `${t.fromBranch.name} → ${t.toBranch.name} still SHIPPED (>2 days).`,
        entityType: "StockTransfer",
        entityId: t.id,
      },
    });
    created.push("OVERDUE_TRANSFER");
  }

  const fails = await prisma.qualityCheck.findMany({
    where: { status: "FAIL", checkedAt: { gte: since } },
    include: { branch: true },
    take: 15,
  });
  for (const q of fails) {
    if (have.has(key("QUALITY_FAIL", q.id))) continue;
    await prisma.opsNotification.create({
      data: {
        branchId: q.branchId,
        severity: "CRITICAL",
        type: "QUALITY_FAIL",
        title: `Food safety fail · ${q.title}`,
        body: `${q.branch.name}: ${q.checkType}${q.notes ? ` — ${q.notes}` : ""}`,
        entityType: "QualityCheck",
        entityId: q.id,
      },
    });
    created.push("QUALITY_FAIL");
  }

  return { created: created.length };
}

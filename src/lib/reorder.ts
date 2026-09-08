import { prisma } from "./prisma";

export type ReorderSuggestion = {
  branchId: string;
  branchName: string;
  branchType: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
  shortage: number;
  suggestQty: number;
  action: "TRANSFER" | "PURCHASE";
  fromBranchId?: string;
  fromBranchName?: string;
};

export async function buildReorderSuggestions(): Promise<ReorderSuggestion[]> {
  const [items, warehouse, kitchen] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { product: { trackStock: true, active: true } },
      include: { product: true, branch: true },
    }),
    prisma.branch.findFirst({ where: { type: "WAREHOUSE", active: true } }),
    prisma.branch.findFirst({ where: { type: "CENTRAL_KITCHEN", active: true } }),
  ]);

  const supply = warehouse || kitchen;
  const suggestions: ReorderSuggestion[] = [];

  for (const item of items) {
    const available = item.quantity - (item.reservedQty || 0);
    if (available > item.reorderLevel) continue;
    const shortage = Math.max(0, item.reorderLevel - available);
    const suggestQty = Math.max(shortage, item.reorderLevel || 10);

    if (item.product.type === "RAW" || item.product.type === "SEMI") {
      suggestions.push({
        branchId: item.branchId,
        branchName: item.branch.name,
        branchType: item.branch.type,
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: available,
        reorderLevel: item.reorderLevel,
        shortage,
        suggestQty,
        action: "PURCHASE",
      });
      continue;
    }

    // Finished goods at retail → transfer from kitchen/warehouse if possible
    if (item.branch.type === "RETAIL" && supply && supply.id !== item.branchId) {
      suggestions.push({
        branchId: item.branchId,
        branchName: item.branch.name,
        branchType: item.branch.type,
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: available,
        reorderLevel: item.reorderLevel,
        shortage,
        suggestQty,
        action: "TRANSFER",
        fromBranchId: supply.id,
        fromBranchName: supply.name,
      });
    } else {
      suggestions.push({
        branchId: item.branchId,
        branchName: item.branch.name,
        branchType: item.branch.type,
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: available,
        reorderLevel: item.reorderLevel,
        shortage,
        suggestQty,
        action: item.product.type === "FINISHED" ? "TRANSFER" : "PURCHASE",
        fromBranchId: supply?.id,
        fromBranchName: supply?.name,
      });
    }
  }

  return suggestions.sort((a, b) => b.shortage - a.shortage);
}

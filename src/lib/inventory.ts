import { prisma } from "./prisma";
import { nextDocNo } from "./utils";

export async function syncInventoryFromLots(branchId: string, productId: string) {
  const lots = await prisma.inventoryLot.findMany({
    where: { branchId, productId, quantity: { gt: 0 } },
  });
  const quantity = lots.reduce((a, l) => a + l.quantity, 0);
  const existing = await prisma.inventoryItem.findUnique({
    where: { branchId_productId: { branchId, productId } },
  });
  return prisma.inventoryItem.upsert({
    where: { branchId_productId: { branchId, productId } },
    create: { branchId, productId, quantity, reorderLevel: 0 },
    update: { quantity },
  }).then(() => ({ quantity, reservedQty: existing?.reservedQty ?? 0 }));
}

/** Add stock and create a dated lot (FEFO-ready). */
export async function receiveStock(input: {
  branchId: string;
  productId: string;
  quantity: number;
  expiryDate?: Date | null;
  sourceType?: string;
  sourceId?: string;
  lotNo?: string;
}) {
  const qty = Number(input.quantity);
  if (qty <= 0) return null;
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product || !product.trackStock) return null;

  const count = await prisma.inventoryLot.count({
    where: { branchId: input.branchId, productId: input.productId },
  });
  await prisma.inventoryLot.create({
    data: {
      branchId: input.branchId,
      productId: input.productId,
      lotNo: input.lotNo || nextDocNo("LOT", count + 1),
      quantity: qty,
      expiryDate: input.expiryDate || null,
      sourceType: input.sourceType || null,
      sourceId: input.sourceId || null,
    },
  });
  return syncInventoryFromLots(input.branchId, input.productId);
}

/** Issue stock FEFO (earliest expiry first). Falls back to plain inventory if no lots. */
export async function issueStock(
  branchId: string,
  productId: string,
  quantity: number,
  allowNegative = false
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.trackStock) return null;
  const need = Number(quantity);
  if (need <= 0) return null;

  const lots = await prisma.inventoryLot.findMany({
    where: { branchId, productId, quantity: { gt: 0 } },
    orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }],
  });

  if (!lots.length) {
    return adjustStockPlain(branchId, productId, -need, allowNegative);
  }

  const available = lots.reduce((a, l) => a + l.quantity, 0);
  if (!allowNegative && available + 0.0001 < need) {
    throw new Error(`Insufficient stock for ${product.name}`);
  }

  let remaining = need;
  for (const lot of lots) {
    if (remaining <= 0) break;
    const take = Math.min(lot.quantity, remaining);
    await prisma.inventoryLot.update({
      where: { id: lot.id },
      data: { quantity: lot.quantity - take },
    });
    remaining -= take;
  }

  return syncInventoryFromLots(branchId, productId);
}

async function adjustStockPlain(
  branchId: string,
  productId: string,
  delta: number,
  allowNegative = false
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.trackStock) return null;

  const existing = await prisma.inventoryItem.findUnique({
    where: { branchId_productId: { branchId, productId } },
  });

  const nextQty = (existing?.quantity ?? 0) + delta;
  if (!allowNegative && nextQty < -0.0001) {
    throw new Error(`Insufficient stock for ${product.name}`);
  }

  return prisma.inventoryItem.upsert({
    where: { branchId_productId: { branchId, productId } },
    create: {
      branchId,
      productId,
      quantity: Math.max(0, nextQty),
      reorderLevel: 0,
    },
    update: { quantity: nextQty },
  });
}

/** Compatible wrapper: positive = receive lot, negative = FEFO issue. */
export async function adjustStock(
  branchId: string,
  productId: string,
  delta: number,
  allowNegative = false
) {
  if (delta > 0) {
    return receiveStock({ branchId, productId, quantity: delta, sourceType: "ADJUST" });
  }
  if (delta < 0) {
    return issueStock(branchId, productId, -delta, allowNegative);
  }
  return null;
}

export async function getBranchPrice(branchId: string, productId: string, listPrice: number) {
  const { getEffectivePrice } = await import("./pricing");
  return getEffectivePrice(branchId, productId, listPrice);
}

export async function getExpiringLots(branchId?: string, withinDays = 3) {
  const until = new Date();
  until.setDate(until.getDate() + withinDays);
  return prisma.inventoryLot.findMany({
    where: {
      quantity: { gt: 0 },
      expiryDate: { not: null, lte: until },
      ...(branchId ? { branchId } : {}),
    },
    include: { product: true, branch: true },
    orderBy: { expiryDate: "asc" },
    take: 50,
  });
}

import { prisma } from "./prisma";

export async function adjustStock(
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

export async function getBranchPrice(branchId: string, productId: string, listPrice: number) {
  const override = await prisma.priceOverride.findUnique({
    where: { branchId_productId: { branchId, productId } },
  });
  return override?.price ?? listPrice;
}

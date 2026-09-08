import { prisma } from "./prisma";
import { earnPoints } from "./loyalty";

/** Apply active percent/fixed promos on top of list/override price. */
export async function getEffectivePrice(
  branchId: string,
  productId: string,
  listPrice: number
) {
  const override = await prisma.priceOverride.findUnique({
    where: { branchId_productId: { branchId, productId } },
  });
  let price = override?.price ?? listPrice;

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  const now = new Date();
  const orFilters: { branchId?: string | null; city?: string | null }[] = [
    { branchId },
    { branchId: null, city: null },
  ];
  if (branch?.city) orFilters.push({ branchId: null, city: branch.city });

  const promos = await prisma.promotion.findMany({
    where: {
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
      OR: orFilters,
    },
    include: { items: true },
  });

  for (const promo of promos) {
    const applies =
      !promo.items.length || promo.items.some((i) => i.productId === productId);
    if (!applies) continue;
    if (promo.type === "PERCENT") {
      price = price * (1 - promo.value / 100);
    } else if (promo.type === "FIXED") {
      price = Math.max(0, price - promo.value);
    } else if (promo.type === "BRANCH_PRICE") {
      price = promo.value;
    }
  }

  return Math.round(price);
}

export async function upsertCustomerFromOrder(input: {
  name: string;
  phone: string;
  email?: string | null;
  branchId?: string;
  orderTotal?: number;
  saleId?: string;
  skipEarn?: boolean;
}) {
  const phone = input.phone.replace(/\s+/g, "");
  const existing = await prisma.customer.findUnique({ where: { phone } });
  const points =
    input.skipEarn || !input.orderTotal
      ? 0
      : earnPoints(input.orderTotal, existing?.loyaltyPoints || 0);

  if (existing) {
    const customer = await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: input.name || existing.name,
        email: input.email || existing.email,
        loyaltyPoints: existing.loyaltyPoints + points,
        preferredBranchId: existing.preferredBranchId || input.branchId || null,
      },
    });
    if (points > 0) {
      await prisma.loyaltyLedger.create({
        data: {
          customerId: customer.id,
          delta: points,
          reason: "Order earn (tier-adjusted Rs100 = 1 pt)",
          saleId: input.saleId || null,
        },
      });
    }
    return customer;
  }

  const customer = await prisma.customer.create({
    data: {
      phone,
      name: input.name,
      email: input.email || null,
      preferredBranchId: input.branchId || null,
      loyaltyPoints: points,
    },
  });
  if (points > 0) {
    await prisma.loyaltyLedger.create({
      data: {
        customerId: customer.id,
        delta: points,
        reason: "Welcome earn",
        saleId: input.saleId || null,
      },
    });
  }
  return customer;
}

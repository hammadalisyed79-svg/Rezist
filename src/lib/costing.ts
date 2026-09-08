import { prisma } from "./prisma";

export type CostRow = {
  productId: string;
  name: string;
  sku: string;
  listPrice: number;
  storedCost: number;
  recipeCost: number;
  effectiveCost: number;
  margin: number;
  marginPct: number;
  lowMargin: boolean;
  missingRecipe: boolean;
  ingredients: { name: string; qty: number; unitCost: number; lineCost: number }[];
};

const LOW_MARGIN_PCT = 35;

export async function computeRecipeCost(productId: string): Promise<number> {
  const items = await prisma.recipeItem.findMany({
    where: { productId },
    include: { ingredient: true },
  });
  return items.reduce((a, r) => a + r.quantity * (r.ingredient.costPrice || 0), 0);
}

export async function getProductCosting(productIds?: string[]): Promise<CostRow[]> {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      type: "FINISHED",
      ...(productIds?.length ? { id: { in: productIds } } : {}),
    },
    include: {
      recipeItems: { include: { ingredient: true } },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => {
    const ingredients = p.recipeItems.map((r) => ({
      name: r.ingredient.name,
      qty: r.quantity,
      unitCost: r.ingredient.costPrice || 0,
      lineCost: r.quantity * (r.ingredient.costPrice || 0),
    }));
    const recipeCost = ingredients.reduce((a, i) => a + i.lineCost, 0);
    const missingRecipe = !ingredients.length;
    const effectiveCost = recipeCost > 0 ? recipeCost : p.costPrice || 0;
    const margin = p.listPrice - effectiveCost;
    const marginPct = p.listPrice > 0 ? (margin / p.listPrice) * 100 : 0;
    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      listPrice: p.listPrice,
      storedCost: p.costPrice,
      recipeCost,
      effectiveCost,
      margin,
      marginPct,
      lowMargin: !missingRecipe && marginPct < LOW_MARGIN_PCT,
      missingRecipe,
      ingredients,
    };
  });
}

export async function syncFinishedCostsFromRecipes() {
  const rows = await getProductCosting();
  let updated = 0;
  for (const row of rows) {
    if (row.recipeCost <= 0) continue;
    await prisma.product.update({
      where: { id: row.productId },
      data: { costPrice: row.recipeCost },
    });
    updated += 1;
  }
  return updated;
}

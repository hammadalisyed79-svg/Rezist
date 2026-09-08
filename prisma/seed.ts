import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Role, BranchType, ProductType } from "../src/lib/roles";

const prisma = new PrismaClient();

async function main() {
  await prisma.onlineOrderLine.deleteMany();
  await prisma.onlineOrder.deleteMany();
  await prisma.wastageRecord.deleteMany();
  await prisma.productionLine.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.dayClose.deleteMany();
  await prisma.saleLine.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockTransferLine.deleteMany();
  await prisma.stockTransfer.deleteMany();
  await prisma.priceOverride.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  const kitchen = await prisma.branch.create({
    data: {
      code: "CK-LHR",
      name: "Rezist Central Kitchen Lahore",
      city: "Lahore",
      address: "Industrial Estate, Kot Lakhpat",
      phone: "+92-42-111-734-948",
      type: BranchType.CENTRAL_KITCHEN,
    },
  });

  const warehouse = await prisma.branch.create({
    data: {
      code: "WH-LHR",
      name: "Rezist Warehouse Lahore",
      city: "Lahore",
      address: "Plot 12, Sundar Industrial Estate",
      phone: "+92-42-111-734-949",
      type: BranchType.WAREHOUSE,
    },
  });

  const gulberg = await prisma.branch.create({
    data: {
      code: "LHR-01",
      name: "Rezist Gulberg",
      city: "Lahore",
      address: "MM Alam Road, Gulberg III",
      phone: "+92-42-3578-1001",
      type: BranchType.RETAIL,
    },
  });

  const f7 = await prisma.branch.create({
    data: {
      code: "ISB-01",
      name: "Rezist F-7 Markaz",
      city: "Islamabad",
      address: "Jinnah Super, F-7 Markaz",
      phone: "+92-51-265-1001",
      type: BranchType.RETAIL,
    },
  });

  const passwordHash = await bcrypt.hash("rezist123", 10);

  await prisma.user.createMany({
    data: [
      {
        email: "admin@rezist.pk",
        name: "HQ Admin",
        passwordHash,
        role: Role.HQ_ADMIN,
      },
      {
        email: "manager.gulberg@rezist.pk",
        name: "Ayesha Manager",
        passwordHash,
        role: Role.BRANCH_MANAGER,
        branchId: gulberg.id,
      },
      {
        email: "cashier.gulberg@rezist.pk",
        name: "Ali Cashier",
        passwordHash,
        role: Role.CASHIER,
        branchId: gulberg.id,
      },
      {
        email: "manager.f7@rezist.pk",
        name: "Sara Manager",
        passwordHash,
        role: Role.BRANCH_MANAGER,
        branchId: f7.id,
      },
    ],
  });

  const cats = await Promise.all(
    [
      { name: "Bread", slug: "bread", sortOrder: 1 },
      { name: "Cakes", slug: "cakes", sortOrder: 2 },
      { name: "Pastries", slug: "pastries", sortOrder: 3 },
      { name: "Savories", slug: "savories", sortOrder: 4 },
      { name: "Beverages", slug: "beverages", sortOrder: 5 },
      { name: "Raw Materials", slug: "raw-materials", sortOrder: 99 },
    ].map((c) => prisma.category.create({ data: c }))
  );

  const bySlug = Object.fromEntries(cats.map((c) => [c.slug, c]));

  const flour = await prisma.product.create({
    data: {
      sku: "RAW-FLOUR-01",
      name: "All Purpose Flour",
      type: ProductType.RAW,
      categoryId: bySlug["raw-materials"].id,
      uom: "kg",
      listPrice: 0,
      costPrice: 180,
      isSellable: false,
      isPublic: false,
    },
  });

  const sugar = await prisma.product.create({
    data: {
      sku: "RAW-SUGAR-01",
      name: "White Sugar",
      type: ProductType.RAW,
      categoryId: bySlug["raw-materials"].id,
      uom: "kg",
      listPrice: 0,
      costPrice: 160,
      isSellable: false,
      isPublic: false,
    },
  });

  const butter = await prisma.product.create({
    data: {
      sku: "RAW-BUTTER-01",
      name: "Butter",
      type: ProductType.RAW,
      categoryId: bySlug["raw-materials"].id,
      uom: "kg",
      listPrice: 0,
      costPrice: 1200,
      isSellable: false,
      isPublic: false,
    },
  });

  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "BRD-WHITE-01",
        name: "Classic White Loaf",
        description: "Soft daily white bread loaf",
        type: ProductType.FINISHED,
        categoryId: bySlug.bread.id,
        listPrice: 180,
        costPrice: 90,
        allergens: "Gluten, Dairy",
      },
    }),
    prisma.product.create({
      data: {
        sku: "BRD-BROWN-01",
        name: "Brown Multigrain",
        description: "Wholesome multigrain brown bread",
        type: ProductType.FINISHED,
        categoryId: bySlug.bread.id,
        listPrice: 220,
        costPrice: 110,
        allergens: "Gluten",
      },
    }),
    prisma.product.create({
      data: {
        sku: "CAK-CHOC-01",
        name: "Chocolate Fudge Cake",
        description: "Rich chocolate cake — whole",
        type: ProductType.FINISHED,
        categoryId: bySlug.cakes.id,
        listPrice: 3200,
        costPrice: 1600,
        allergens: "Gluten, Dairy, Eggs",
      },
    }),
    prisma.product.create({
      data: {
        sku: "CAK-PINE-01",
        name: "Pineapple Cake",
        description: "Classic pineapple cream cake",
        type: ProductType.FINISHED,
        categoryId: bySlug.cakes.id,
        listPrice: 2800,
        costPrice: 1400,
        allergens: "Gluten, Dairy, Eggs",
      },
    }),
    prisma.product.create({
      data: {
        sku: "PST-CROIS-01",
        name: "Butter Croissant",
        description: "Flaky French-style croissant",
        type: ProductType.FINISHED,
        categoryId: bySlug.pastries.id,
        listPrice: 160,
        costPrice: 70,
        allergens: "Gluten, Dairy",
      },
    }),
    prisma.product.create({
      data: {
        sku: "PST-DANISH-01",
        name: "Fruit Danish",
        description: "Danish pastry with seasonal fruit",
        type: ProductType.FINISHED,
        categoryId: bySlug.pastries.id,
        listPrice: 190,
        costPrice: 85,
        allergens: "Gluten, Dairy, Eggs",
      },
    }),
    prisma.product.create({
      data: {
        sku: "SAV-PATTY-01",
        name: "Chicken Patty",
        description: "Spiced chicken filled pastry",
        type: ProductType.FINISHED,
        categoryId: bySlug.savories.id,
        listPrice: 150,
        costPrice: 75,
        allergens: "Gluten",
      },
    }),
    prisma.product.create({
      data: {
        sku: "BEV-CHAI-01",
        name: "Karak Chai",
        description: "Strong milky karak chai",
        type: ProductType.FINISHED,
        categoryId: bySlug.beverages.id,
        listPrice: 120,
        costPrice: 40,
        trackStock: false,
      },
    }),
  ]);

  const whiteLoaf = products[0];
  await prisma.recipeItem.createMany({
    data: [
      { productId: whiteLoaf.id, ingredientId: flour.id, quantity: 0.35 },
      { productId: whiteLoaf.id, ingredientId: sugar.id, quantity: 0.04 },
      { productId: whiteLoaf.id, ingredientId: butter.id, quantity: 0.03 },
    ],
  });

  const finished = products;
  const raws = [flour, sugar, butter];

  for (const branch of [warehouse, kitchen]) {
    for (const p of raws) {
      await prisma.inventoryItem.create({
        data: {
          branchId: branch.id,
          productId: p.id,
          quantity: 500,
          reorderLevel: 50,
        },
      });
    }
    for (const p of finished) {
      await prisma.inventoryItem.create({
        data: {
          branchId: branch.id,
          productId: p.id,
          quantity: p.trackStock ? 200 : 0,
          reorderLevel: 20,
        },
      });
    }
  }

  for (const branch of [gulberg, f7]) {
    for (const p of finished) {
      await prisma.inventoryItem.create({
        data: {
          branchId: branch.id,
          productId: p.id,
          quantity: p.trackStock ? 40 : 0,
          reorderLevel: 10,
        },
      });
    }
  }

  console.log("Seeded Rezist ERP:");
  console.log("  admin@rezist.pk / rezist123");
  console.log("  Branches:", kitchen.code, warehouse.code, gulberg.code, f7.code);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

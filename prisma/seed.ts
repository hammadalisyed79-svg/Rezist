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
      code: "CK-GUJ",
      name: "Rezist Central Kitchen Gujrat",
      city: "Gujrat",
      address: "Rehman Shaheed Road production unit",
      phone: "+92 331 4213137",
      type: BranchType.CENTRAL_KITCHEN,
    },
  });

  const warehouse = await prisma.branch.create({
    data: {
      code: "WH-GUJ",
      name: "Rezist Warehouse Gujrat",
      city: "Gujrat",
      address: "Rehman Shaheed Road storage",
      phone: "+92 331 4213137",
      type: BranchType.WAREHOUSE,
    },
  });

  const retailSpecs = [
    {
      code: "GUJ-01",
      name: "Rezist Gujrat",
      city: "Gujrat",
      address: "Rehman Shaheed Road, Gujrat, 50700",
    },
    {
      code: "KHR-01",
      name: "Rezist Kharian",
      city: "Kharian",
      address: "Kharian City",
    },
    {
      code: "JHL-01",
      name: "Rezist Jhelum Cantt",
      city: "Jhelum",
      address: "Jhelum Cantonment",
    },
    {
      code: "SGD-01",
      name: "Rezist Sargodha",
      city: "Sargodha",
      address: "Sargodha City",
    },
    {
      code: "DSK-01",
      name: "Rezist Daska",
      city: "Daska",
      address: "Daska City",
    },
    {
      code: "MRP-01",
      name: "Rezist Mirpur",
      city: "Mirpur",
      address: "Mirpur Azad Kashmir",
    },
    {
      code: "LLM-01",
      name: "Rezist Lala Musa",
      city: "Lala Musa",
      address: "Moh. Qaziyan Road, Main GT Road, Lala Musa",
    },
  ];

  const retailBranches = [];
  for (const spec of retailSpecs) {
    retailBranches.push(
      await prisma.branch.create({
        data: {
          ...spec,
          phone: "+92 331 4213137",
          type: BranchType.RETAIL,
        },
      })
    );
  }

  const gujrat = retailBranches[0];
  const jhelum = retailBranches[2];

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
        email: "manager.gujrat@rezist.pk",
        name: "Branch Manager Gujrat",
        passwordHash,
        role: Role.BRANCH_MANAGER,
        branchId: gujrat.id,
      },
      {
        email: "cashier.gujrat@rezist.pk",
        name: "Cashier Gujrat",
        passwordHash,
        role: Role.CASHIER,
        branchId: gujrat.id,
      },
      {
        email: "manager.jhelum@rezist.pk",
        name: "Branch Manager Jhelum",
        passwordHash,
        role: Role.BRANCH_MANAGER,
        branchId: jhelum.id,
      },
    ],
  });

  const cats = await Promise.all(
    [
      { name: "Cakes", slug: "cakes", sortOrder: 1 },
      { name: "Brownies", slug: "brownies", sortOrder: 2 },
      { name: "Cupcakes", slug: "cupcakes", sortOrder: 3 },
      { name: "Cookies", slug: "cookies", sortOrder: 4 },
      { name: "Donuts", slug: "donuts", sortOrder: 5 },
      { name: "Desserts", slug: "desserts", sortOrder: 6 },
      { name: "Bread", slug: "bread", sortOrder: 7 },
      { name: "Beverages", slug: "beverages", sortOrder: 8 },
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
        sku: "CAK-CADB-01",
        name: "Cadbury Cake",
        description: "Signature Cadbury chocolate cake — rich, moist, Ir-Rezistable",
        type: ProductType.FINISHED,
        categoryId: bySlug.cakes.id,
        listPrice: 3500,
        costPrice: 1750,
        allergens: "Gluten, Dairy, Eggs, Soy",
        imageUrl: "/brand/hero-cake.jpg",
      },
    }),
    prisma.product.create({
      data: {
        sku: "CAK-CHOC-01",
        name: "Chocolate Fudge Cake",
        description: "Rich chocolate cake with hazelnut finish — whole",
        type: ProductType.FINISHED,
        categoryId: bySlug.cakes.id,
        listPrice: 3200,
        costPrice: 1600,
        allergens: "Gluten, Dairy, Eggs, Nuts",
        imageUrl: "/brand/hero-cake.jpg",
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
        sku: "BRW-FUDGE-01",
        name: "Fudge Brownie",
        description: "Dense chocolate brownie square",
        type: ProductType.FINISHED,
        categoryId: bySlug.brownies.id,
        listPrice: 250,
        costPrice: 110,
        allergens: "Gluten, Dairy, Eggs",
        imageUrl: "/brand/gallery-1.jpg",
      },
    }),
    prisma.product.create({
      data: {
        sku: "CUP-VAN-01",
        name: "Vanilla Cupcake",
        description: "Soft vanilla cupcake with buttercream",
        type: ProductType.FINISHED,
        categoryId: bySlug.cupcakes.id,
        listPrice: 220,
        costPrice: 90,
        allergens: "Gluten, Dairy, Eggs",
        imageUrl: "/brand/gallery-2.jpg",
      },
    }),
    prisma.product.create({
      data: {
        sku: "CKE-CHOC-01",
        name: "Chocolate Chip Cookie",
        description: "Classic chewy chocolate chip cookie",
        type: ProductType.FINISHED,
        categoryId: bySlug.cookies.id,
        listPrice: 150,
        costPrice: 60,
        allergens: "Gluten, Dairy",
      },
    }),
    prisma.product.create({
      data: {
        sku: "DNT-GLAZE-01",
        name: "Glazed Donut",
        description: "Soft yeast donut with sugar glaze",
        type: ProductType.FINISHED,
        categoryId: bySlug.donuts.id,
        listPrice: 180,
        costPrice: 70,
        allergens: "Gluten, Dairy, Eggs",
        imageUrl: "/brand/gallery-3.jpg",
      },
    }),
    prisma.product.create({
      data: {
        sku: "DST-TIR-01",
        name: "Mini Tiramisu Cup",
        description: "Coffee-soaked dessert cup",
        type: ProductType.FINISHED,
        categoryId: bySlug.desserts.id,
        listPrice: 450,
        costPrice: 200,
        allergens: "Dairy, Eggs, Gluten",
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

  for (const branch of retailBranches) {
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
  console.log(
    "  Branches:",
    kitchen.code,
    warehouse.code,
    ...retailBranches.map((b) => b.code)
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import { prisma } from "@/lib/prisma";
import { SiteShell } from "@/components/SiteShell";
import { OrderClient } from "@/components/OrderClient";
import { CategoryRail } from "@/components/CategoryRail";

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const sp = await searchParams;
  const [branches, products, categories] = await Promise.all([
    prisma.branch.findMany({
      where: { active: true, type: "RETAIL" },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: { active: true, isPublic: true, isSellable: true },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({
      where: { slug: { not: "raw-materials" } },
      include: { _count: { select: { products: { where: { isPublic: true, active: true } } } } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const cities = [...new Set(branches.map((b) => b.city))];

  return (
    <SiteShell cities={cities}>
      <main className="lz-shop-section lz-order-page">
        <div className="lz-shop-head">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Your order</h1>
            <p className="muted">
              Confirm lounge, pickup or delivery, place order, then print your customer slip.
            </p>
          </div>
        </div>
        <CategoryRail
          categories={categories
            .filter((c) => c._count.products > 0)
            .map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.products }))}
        />
        <OrderClient
          branches={branches}
          products={products}
          initialBranchId={sp.branchId || branches[0]?.id}
        />
      </main>
    </SiteShell>
  );
}

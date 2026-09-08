import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { CategoryRail } from "@/components/CategoryRail";
import { ProductCard } from "@/components/ProductCard";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; branchId?: string }>;
}) {
  const sp = await searchParams;
  const [branches, categories] = await Promise.all([
    prisma.branch.findMany({
      where: { active: true, type: "RETAIL" },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
    prisma.category.findMany({
      where: { slug: { not: "raw-materials" } },
      include: {
        products: {
          where: { active: true, isPublic: true, isSellable: true },
          include: { category: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const cities = [...new Set(branches.map((b) => b.city))];
  const catRail = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    count: c.products.length,
  }));
  const products = sp.cat
    ? categories.find((c) => c.slug === sp.cat)?.products || []
    : categories.flatMap((c) => c.products);
  const title = sp.cat
    ? categories.find((c) => c.slug === sp.cat)?.name || "Menu"
    : "All products";

  return (
    <div className="site lz-store">
      <SiteHeader cities={cities} />
      <main className="lz-shop-section">
        <div className="lz-shop-head">
          <div>
            <p className="eyebrow">Online menu</p>
            <h1>{title}</h1>
            <p className="muted">Browse by category · add to cart · checkout by branch.</p>
          </div>
        </div>
        <CategoryRail categories={catRail} active={sp.cat} />
        <div className="lz-product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {!products.length ? <p className="muted">No products in this category yet.</p> : null}
      </main>
      <SiteFooter />
    </div>
  );
}

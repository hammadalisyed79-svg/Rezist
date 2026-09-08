import { prisma } from "@/lib/prisma";
import { SiteShell } from "@/components/SiteShell";
import { MenuExplorer } from "@/components/MenuExplorer";

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
  const catRail = categories
    .filter((c) => c.products.length > 0)
    .map((c) => ({
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
    : "All desserts";

  return (
    <SiteShell cities={cities} branches={branches}>
      <main className="lz-shop-section">
        <div className="lz-shop-head">
          <div>
            <p className="eyebrow">Online menu</p>
            <h1>{title}</h1>
            <p className="muted">Search, filter by category, tap + Add — review cart anytime.</p>
          </div>
        </div>
        <MenuExplorer categories={catRail} products={products} activeCat={sp.cat} />
      </main>
    </SiteShell>
  );
}

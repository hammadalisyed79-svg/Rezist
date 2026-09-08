import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brand } from "@/lib/brand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrustBar } from "@/components/TrustBar";
import { StoreBanner } from "@/components/StoreBanner";
import { CategoryRail } from "@/components/CategoryRail";
import { ProductCard } from "@/components/ProductCard";

export default async function HomePage() {
  const [branches, categories, products] = await Promise.all([
    prisma.branch.findMany({
      where: { active: true, type: "RETAIL" },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
    prisma.category.findMany({
      where: { slug: { not: "raw-materials" } },
      include: {
        _count: { select: { products: { where: { active: true, isPublic: true } } } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.product.findMany({
      where: { active: true, isPublic: true, isSellable: true, type: "FINISHED" },
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    }),
  ]);

  const cities = [...new Set(branches.map((b) => b.city))];
  const catRail = categories
    .filter((c) => c._count.products > 0)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.products }));

  return (
    <div className="site lz-store">
      <SiteHeader cities={cities} />
      <StoreBanner />
      <TrustBar />

      <section className="lz-shop-section">
        <div className="lz-shop-head">
          <div>
            <p className="eyebrow">Menu</p>
            <h2>Order your favourites</h2>
          </div>
          <Link className="text-link" href="/menu">
            View all →
          </Link>
        </div>
        <CategoryRail categories={catRail} />
        <div className="lz-product-grid">
          {products.slice(0, 12).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="lz-shop-section muted-section">
        <div className="lz-shop-head">
          <div>
            <p className="eyebrow">Branches</p>
            <h2>Choose nearest lounge</h2>
            <p className="muted">{brand.cities.join(" · ")}</p>
          </div>
        </div>
        <div className="branch-grid">
          {branches.map((b) => (
            <article key={b.id} className="branch-card">
              <p className="city">{b.city}</p>
              <h3>{b.name}</h3>
              <p>{b.address}</p>
              <Link href={`/order?branchId=${b.id}`}>Order from here →</Link>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

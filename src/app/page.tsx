import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { brand } from "@/lib/brand";
import { SiteShell, SectionHead } from "@/components/SiteShell";
import { TrustBar } from "@/components/TrustBar";
import { StoreBanner } from "@/components/StoreBanner";
import { CategoryRail } from "@/components/CategoryRail";
import { ProductCard } from "@/components/ProductCard";
import { HowItWorks } from "@/components/HowItWorks";

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

  const featured = products.filter((p) => p.category?.slug === "cakes").slice(0, 4);
  const popular = products.slice(0, 12);

  return (
    <SiteShell cities={cities}>
      <StoreBanner />
      <TrustBar />

      <section className="lz-shop-section lz-reveal">
        <SectionHead
          eyebrow="Signature"
          title="Cakes worth the craving"
          href="/menu?cat=cakes"
          linkLabel="All cakes →"
        />
        <div className="lz-product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} featured />
          ))}
        </div>
      </section>

      <section className="lz-shop-section lz-reveal">
        <SectionHead eyebrow="Full menu" title="Order your favourites" href="/menu" />
        <CategoryRail categories={catRail} />
        <div className="lz-product-grid">
          {popular.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <HowItWorks />

      <section className="lz-mood lz-reveal">
        <div className="lz-mood-copy">
          <p className="eyebrow">The lounge</p>
          <h2>{brand.tagline}</h2>
          <p>{brand.bio}</p>
          <Link className="btn" href="/order">
            Review cart
          </Link>
        </div>
        <div className="lz-mood-gallery">
          {brand.gallery.slice(0, 4).map((src, i) => (
            <div key={src} className={`lz-mood-shot s${i + 1}`}>
              <Image src={src} alt="" fill sizes="(max-width: 800px) 50vw, 280px" />
            </div>
          ))}
        </div>
      </section>

      <section className="lz-shop-section muted-section lz-reveal">
        <SectionHead
          eyebrow="Branches"
          title="Choose nearest lounge"
          text={brand.cities.join(" · ")}
          href="/branches"
          linkLabel="All branches →"
        />
        <div className="branch-grid lz-branch-scroll">
          {branches.slice(0, 6).map((b) => (
            <article key={b.id} className="branch-card">
              <p className="city">{b.city}</p>
              <h3>{b.name}</h3>
              <p>{b.address}</p>
              <Link href={`/order?branchId=${b.id}`}>Order from here →</Link>
            </article>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}

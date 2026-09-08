import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatPKR } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrustBar } from "@/components/TrustBar";
import { HomeOrderStart } from "@/components/HomeOrderStart";
import { AddToCartButton } from "@/components/AddToCartButton";

export default async function HomePage() {
  const [branches, categories, bestsellers] = await Promise.all([
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
      take: 8,
      orderBy: { listPrice: "desc" },
    }),
  ]);

  const cities = [...new Set(branches.map((b) => b.city))];

  return (
    <div className="site">
      <SiteHeader />
      <section className="hero layers-hero">
        <div className="hero-copy">
          <Image src={brand.logo} alt={brand.name} width={88} height={88} className="hero-logo" priority />
          <p className="brand-lockup">{brand.name}</p>
          <p className="tagline-line">{brand.tagline}</p>
          <h1>{brand.slogan}</h1>
          <p className="lede">
            Order like Pakistan&apos;s top dessert chains — pick pickup or delivery, choose your
            branch, then shop cakes, brownies, cupcakes and more.
          </p>
          <HomeOrderStart branches={branches} cities={cities} />
        </div>
        <div className="hero-visual">
          <Image
            src={brand.heroImage}
            alt="Rezist signature chocolate cake"
            fill
            className="hero-photo"
            priority
            sizes="(max-width: 960px) 100vw, 50vw"
          />
        </div>
      </section>

      <TrustBar />

      <section className="section">
        <div className="section-head">
          <p className="eyebrow">Shop by category</p>
          <h2>Menu categories</h2>
        </div>
        <div className="category-chips">
          {categories
            .filter((c) => c._count.products > 0)
            .map((c) => (
              <Link key={c.id} href={`/menu?cat=${c.slug}`} className="category-chip">
                <strong>{c.name}</strong>
                <span>{c._count.products} items</span>
              </Link>
            ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <p className="eyebrow">Bestsellers</p>
          <h2>Most ordered desserts</h2>
        </div>
        <div className="product-shop-grid">
          {bestsellers.map((p) => (
            <article key={p.id} className="product-card">
              <div className="product-card-media">
                <Image
                  src={p.imageUrl || brand.heroImage}
                  alt={p.name}
                  fill
                  sizes="240px"
                />
              </div>
              <div className="product-card-body">
                <small>{p.category?.name}</small>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="product-card-row">
                  <strong>{formatPKR(p.listPrice)}</strong>
                  <AddToCartButton productId={p.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
        <Link className="btn" href="/menu">
          View full menu
        </Link>
      </section>

      <section className="section muted-section">
        <div className="section-head">
          <p className="eyebrow">Branches</p>
          <h2>Choose your nearest branch</h2>
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

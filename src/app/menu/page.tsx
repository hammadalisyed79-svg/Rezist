import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatPKR } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AddToCartButton } from "@/components/AddToCartButton";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const sp = await searchParams;
  const categories = await prisma.category.findMany({
    where: { slug: { not: "raw-materials" } },
    include: {
      products: {
        where: { active: true, isPublic: true, isSellable: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const active = categories.find((c) => c.slug === sp.cat) || categories.find((c) => c.products.length);
  const products = active?.products || [];

  return (
    <div className="site">
      <SiteHeader />
      <main className="section menu-shop">
        <div className="section-head">
          <p className="eyebrow">Online menu</p>
          <h1>Shop desserts</h1>
          <p>Layers-style category browse — add to cart, then checkout by branch.</p>
        </div>
        <div className="menu-shop-layout">
          <aside className="menu-cats">
            <Link href="/menu" className={!sp.cat ? "active" : undefined}>
              All
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/menu?cat=${c.slug}`}
                className={sp.cat === c.slug ? "active" : undefined}
              >
                {c.name}
                <span>{c.products.length}</span>
              </Link>
            ))}
          </aside>
          <section>
            <h2>{sp.cat ? active?.name || "Menu" : "All products"}</h2>
            <div className="product-shop-grid">
              {(sp.cat
                ? products
                : categories.flatMap((c) => c.products)
              ).map((p) => (
                <article key={p.id} className="product-card">
                  <div className="product-card-media">
                    <Image src={p.imageUrl || brand.heroImage} alt={p.name} fill sizes="240px" />
                  </div>
                  <div className="product-card-body">
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                    {p.allergens ? <small>Allergens: {p.allergens}</small> : null}
                    <div className="product-card-row">
                      <strong>{formatPKR(p.listPrice)}</strong>
                      <AddToCartButton productId={p.id} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!(sp.cat ? products : categories.flatMap((c) => c.products)).length ? (
              <p className="muted">No products in this category yet.</p>
            ) : null}
            <Link className="btn" href="/order" style={{ marginTop: "1.25rem" }}>
              Go to checkout
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPKR } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { SiteShell } from "@/components/SiteShell";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const product = await prisma.product.findFirst({
    where: {
      sku: decodeURIComponent(sku),
      active: true,
      isPublic: true,
      isSellable: true,
    },
    include: { category: true },
  });
  if (!product) notFound();

  const [related, branches] = await Promise.all([
    prisma.product.findMany({
      where: {
        active: true,
        isPublic: true,
        isSellable: true,
        id: { not: product.id },
        ...(product.categoryId ? { categoryId: product.categoryId } : {}),
      },
      include: { category: true },
      take: 4,
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { active: true, type: "RETAIL" },
      select: { city: true },
    }),
  ]);
  const cities = [...new Set(branches.map((b) => b.city))];

  return (
    <SiteShell cities={cities}>
      <main className="lz-shop-section lz-pdp">
        <nav className="lz-breadcrumb" aria-label="Breadcrumb">
          <Link href="/menu">Menu</Link>
          <span aria-hidden>/</span>
          {product.category ? (
            <Link href={`/menu?cat=${product.category.slug}`}>{product.category.name}</Link>
          ) : (
            <span>Dessert</span>
          )}
          <span aria-hidden>/</span>
          <span aria-current="page">{product.name}</span>
        </nav>

        <article className="lz-pdp-hero">
          <div className="lz-pdp-media">
            <Image
              src={product.imageUrl || brand.heroImage}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 800px) 100vw, 480px"
            />
          </div>
          <div className="lz-pdp-copy">
            {product.category?.name ? <p className="eyebrow">{product.category.name}</p> : null}
            <h1>{product.name}</h1>
            <p className="lz-pdp-price">{formatPKR(product.listPrice)}</p>
            <p>{product.description || "Freshly prepared at your nearest Rezist lounge."}</p>
            {product.allergens ? (
              <p className="lz-meta" role="note">
                {product.allergens}
              </p>
            ) : null}
            <div className="lz-pdp-actions">
              <AddToCartButton productId={product.id} unitPrice={product.listPrice} />
              <Link className="btn" href="/order">
                Review cart
              </Link>
            </div>
            <p className="muted lz-pdp-hint">
              Pickup or delivery from any of our {cities.length} cities · free delivery from{" "}
              {formatPKR(brand.freeDeliveryMin)}.
            </p>
          </div>
        </article>

        {related.length ? (
          <section className="lz-pdp-related">
            <div className="lz-shop-head">
              <div>
                <p className="eyebrow">Also try</p>
                <h2>More from {product.category?.name || "the menu"}</h2>
              </div>
              <Link className="text-link" href={product.category ? `/menu?cat=${product.category.slug}` : "/menu"}>
                Browse category →
              </Link>
            </div>
            <div className="lz-product-grid">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </SiteShell>
  );
}

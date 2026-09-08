import Image from "next/image";
import Link from "next/link";
import { formatPKR } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { AddToCartButton } from "@/components/AddToCartButton";

export function ProductCard({
  product,
  featured = false,
}: {
  product: {
    id: string;
    sku?: string;
    name: string;
    description: string | null;
    listPrice: number;
    imageUrl: string | null;
    allergens?: string | null;
    category?: { name: string } | null;
  };
  featured?: boolean;
}) {
  const href = product.sku ? `/menu/${encodeURIComponent(product.sku)}` : "/menu";

  return (
    <article className={`lz-product${featured ? " featured" : ""}`}>
      <Link href={href} className="lz-product-media" aria-label={`View ${product.name}`}>
        <Image
          src={product.imageUrl || brand.heroImage}
          alt=""
          fill
          sizes="(max-width: 640px) 112px, 160px"
        />
      </Link>
      <div className="lz-product-body">
        {product.category?.name ? <small className="lz-cat">{product.category.name}</small> : null}
        <h3>
          <Link href={href}>{product.name}</Link>
        </h3>
        <p>{product.description || "Freshly prepared at your nearest Rezist lounge."}</p>
        {product.allergens ? <span className="lz-meta">{product.allergens}</span> : null}
        <div className="lz-product-row">
          <strong>{formatPKR(product.listPrice)}</strong>
          <AddToCartButton productId={product.id} unitPrice={product.listPrice} />
        </div>
      </div>
    </article>
  );
}

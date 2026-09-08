import Image from "next/image";
import { formatPKR } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { AddToCartButton } from "@/components/AddToCartButton";

export function ProductCard({
  product,
}: {
  product: {
    id: string;
    name: string;
    description: string | null;
    listPrice: number;
    imageUrl: string | null;
    allergens?: string | null;
    category?: { name: string } | null;
  };
}) {
  return (
    <article className="lz-product">
      <div className="lz-product-media">
        <Image
          src={product.imageUrl || brand.heroImage}
          alt={product.name}
          fill
          sizes="160px"
        />
      </div>
      <div className="lz-product-body">
        {product.category?.name ? <small className="lz-cat">{product.category.name}</small> : null}
        <h3>{product.name}</h3>
        <p>{product.description || "Freshly prepared at your nearest Rezist lounge."}</p>
        {product.allergens ? <span className="lz-meta">{product.allergens}</span> : null}
        <div className="lz-product-row">
          <strong>{formatPKR(product.listPrice)}</strong>
          <AddToCartButton productId={product.id} />
        </div>
      </div>
    </article>
  );
}

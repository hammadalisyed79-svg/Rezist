import { brand } from "@/lib/brand";

export function TrustBar() {
  return (
    <section className="trust-bar">
      <div>
        <strong>Free delivery</strong>
        <span>on orders above Rs. {brand.freeDeliveryMin.toLocaleString("en-PK")}</span>
      </div>
      <div>
        <strong>Dessert lounge</strong>
        <span>{brand.cities.length} cities & growing</span>
      </div>
      <div>
        <strong>{brand.followersLabel}</strong>
        <a href={brand.instagramUrl} target="_blank" rel="noreferrer">
          @{brand.instagram}
        </a>
      </div>
      <div>
        <strong>Call now</strong>
        <a href={brand.phoneHref}>{brand.phone}</a>
      </div>
    </section>
  );
}

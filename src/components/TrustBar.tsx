import { brand } from "@/lib/brand";

export function TrustBar() {
  return (
    <section className="trust-bar">
      <div>
        <strong>Free delivery</strong>
        <span>on orders above Rs. {brand.freeDeliveryMin.toLocaleString("en-PK")}</span>
      </div>
      <div>
        <strong>Secure checkout</strong>
        <span>Cash, card & wallets</span>
      </div>
      <div>
        <strong>Neighborhood bakers</strong>
        <span>Branches across Punjab</span>
      </div>
      <div>
        <strong>Call now</strong>
        <a href={brand.phoneHref}>{brand.phone}</a>
      </div>
    </section>
  );
}

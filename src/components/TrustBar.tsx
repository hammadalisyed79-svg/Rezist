import { brand } from "@/lib/brand";

export function TrustBar() {
  return (
    <section className="trust-bar lz-trust" aria-label="Why order with Rezist">
      <div>
        <strong>Free delivery</strong>
        <span>Orders above Rs. {brand.freeDeliveryMin.toLocaleString("en-PK")}</span>
      </div>
      <div>
        <strong>{brand.cities.length} cities</strong>
        <span>Company-owned lounges</span>
      </div>
      <div>
        <strong>Fresh daily</strong>
        <span>Hybrid kitchen + branch bake</span>
      </div>
      <div>
        <strong>Talk to us</strong>
        <a href={brand.phoneHref}>{brand.phone}</a>
      </div>
    </section>
  );
}

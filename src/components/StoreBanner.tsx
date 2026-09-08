import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";

export function StoreBanner() {
  return (
    <section className="lz-banner" aria-label="Rezist hero">
      <div className="lz-banner-slide">
        <Image
          src={brand.heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="lz-banner-img"
        />
        <div className="lz-banner-copy">
          <p className="lz-brand-mark">{brand.name}</p>
          <h1>{brand.slogan}</h1>
          <p>
            Signature cakes & desserts — pickup or delivery across {brand.cities.length} Pakistan
            cities.
          </p>
          <div className="hero-cta">
            <Link className="btn" href="/menu">
              Order now
            </Link>
            <Link className="btn-ghost" href="/branches">
              Find a branch
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

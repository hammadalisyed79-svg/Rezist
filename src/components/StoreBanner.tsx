import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";

export function StoreBanner() {
  return (
    <section className="lz-banner">
      <div className="lz-banner-slide">
        <Image
          src={brand.heroImage}
          alt="Rezist desserts"
          fill
          priority
          sizes="100vw"
          className="lz-banner-img"
        />
        <div className="lz-banner-copy">
          <p className="eyebrow">Rezist dessert lounge</p>
          <h1>{brand.slogan}</h1>
          <p>Cakes, brownies, cupcakes & more — order pickup or delivery from your nearest branch.</p>
          <div className="hero-cta">
            <Link className="btn" href="/menu">
              Start ordering
            </Link>
            <Link className="btn-ghost" href="/branches">
              Find a branch
            </Link>
          </div>
        </div>
      </div>
      <div className="lz-banner-thumbs">
        {brand.gallery.slice(0, 4).map((src, i) => (
          <div key={src} className="lz-banner-thumb">
            <Image src={src} alt={`Featured dessert ${i + 1}`} fill sizes="120px" />
          </div>
        ))}
      </div>
    </section>
  );
}

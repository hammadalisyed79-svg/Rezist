import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatPKR } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default async function HomePage() {
  const branches = await prisma.branch.findMany({
    where: { active: true, type: "RETAIL" },
    orderBy: { city: "asc" },
    take: 6,
  });
  const featured = await prisma.product.findMany({
    where: { active: true, isPublic: true, isSellable: true, type: "FINISHED" },
    take: 4,
    orderBy: { listPrice: "desc" },
  });

  return (
    <div className="site">
      <SiteHeader />
      <section className="hero">
        <div className="hero-copy">
          <Image
            src={brand.logo}
            alt={brand.name}
            width={96}
            height={96}
            className="hero-logo"
            priority
          />
          <p className="brand-lockup">{brand.name}</p>
          <p className="tagline-line">{brand.tagline}</p>
          <h1>{brand.slogan}</h1>
          <p className="lede">
            Premium dessert shop from Gujrat across Pakistan — Cadbury cakes, brownies, and daily
            bake. Order pickup from your nearest branch.
          </p>
          <div className="hero-cta">
            <Link className="btn" href="/order">
              Order pickup
            </Link>
            <a className="btn-ghost" href={brand.phoneHref}>
              Call {brand.phone}
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src={brand.heroImage}
            alt="Rezist signature chocolate cake with branded box"
            fill
            className="hero-photo"
            priority
            sizes="(max-width: 960px) 100vw, 50vw"
          />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <p className="eyebrow">Signature</p>
          <h2>Ir-Rezistable bake</h2>
          <p>Menu live from the Rezist ERP catalog — same SKUs your branches sell.</p>
        </div>
        <div className="menu-row">
          {featured.map((p) => (
            <article key={p.id} className="menu-item">
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <strong>{formatPKR(p.listPrice)}</strong>
            </article>
          ))}
        </div>
        <Link className="text-link" href="/menu">
          Full menu →
        </Link>
      </section>

      <section className="section gallery-section">
        <div className="section-head">
          <p className="eyebrow">From our kitchen</p>
          <h2>Moments from Rezistpk</h2>
        </div>
        <div className="brand-gallery">
          {brand.gallery.map((src, i) => (
            <div key={src} className="gallery-frame">
              <Image src={src} alt={`Rezist bakery photo ${i + 1}`} fill sizes="33vw" />
            </div>
          ))}
        </div>
      </section>

      <section className="section muted-section">
        <div className="section-head">
          <h2>Branches</h2>
          <p>HQ on Rehman Shaheed Road, Gujrat — expanding across Punjab.</p>
        </div>
        <div className="branch-row">
          {branches.map((b) => (
            <article key={b.id}>
              <h3>{b.name}</h3>
              <p>
                {b.city} · {b.address}
              </p>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

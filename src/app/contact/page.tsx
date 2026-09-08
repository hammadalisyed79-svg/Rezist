import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { brand } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ContactPage() {
  const branches = await prisma.branch.findMany({
    where: { active: true, type: "RETAIL" },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });
  const cities = [...new Set(branches.map((b) => b.city))];

  return (
    <div className="site lz-store">
      <SiteHeader cities={cities} />
      <main className="lz-shop-section">
        <div className="lz-shop-head">
          <div>
            <p className="eyebrow">Contact</p>
            <h1>We are your neighborhood bakers</h1>
            <p className="muted">{brand.slogan} — reach HQ or your nearest branch.</p>
          </div>
        </div>

        <div className="contact-grid">
          <article className="panel">
            <h2>Head office</h2>
            <p>{brand.hqAddress}</p>
            <p>
              <a href={brand.phoneHref}>{brand.phone}</a>
            </p>
            <p>
              <a href={brand.emailHref}>{brand.email}</a>
            </p>
            <p>
              <a href={brand.instagramUrl} target="_blank" rel="noreferrer">
                Instagram @{brand.instagram}
              </a>
            </p>
            <p>
              <a href={brand.facebookUrl} target="_blank" rel="noreferrer">
                Facebook Rezistpk
              </a>
            </p>
          </article>
          <article className="panel">
            <h2>Order help</h2>
            <p>Need a cake for today? Call us or start online ordering.</p>
            <div className="hero-cta">
              <Link className="btn" href="/order">
                Order online
              </Link>
              <a className="btn-ghost" href={brand.phoneHref}>
                Call now
              </a>
            </div>
          </article>
        </div>

        <section style={{ marginTop: "2rem" }}>
          <h2>Locate a branch</h2>
          <div className="branch-grid">
            {branches.map((b) => (
              <article key={b.id} className="branch-card">
                <p className="city">{b.city}</p>
                <h3>{b.name}</h3>
                <p>{b.address}</p>
                {b.phone ? <p>{b.phone}</p> : null}
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

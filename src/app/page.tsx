import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPKR } from "@/lib/utils";
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
          <p className="brand-lockup">Rezist</p>
          <h1>Fresh from our ovens, across Pakistan.</h1>
          <p className="lede">
            Company-owned bakeries with central craft and neighborhood warmth — breads, cakes, and
            daily bake, branch by branch.
          </p>
          <div className="hero-cta">
            <Link className="btn" href="/order">
              Order pickup
            </Link>
            <Link className="btn-ghost" href="/branches">
              Find a branch
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-glow" />
          <div className="hero-plate">
            <span>Daily bake</span>
            <strong>Hybrid kitchen model</strong>
            <p>Central production + branch finishing for freshness nationwide.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Signature bake</h2>
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

      <section className="section muted-section">
        <div className="section-head">
          <h2>Branches</h2>
          <p>Pilot cities live now — more outlets rolling out across Pakistan.</p>
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

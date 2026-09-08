import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import Link from "next/link";

export default async function BranchesPublicPage() {
  const branches = await prisma.branch.findMany({
    where: { active: true, type: "RETAIL" },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });
  const cities = [...new Set(branches.map((b) => b.city))];

  return (
    <div className="site">
      <SiteHeader />
      <main className="section">
        <div className="section-head">
          <p className="eyebrow">Locations</p>
          <h1>Choose your nearest branch</h1>
          <p>{cities.join(" · ")} — Layers-style city coverage, Rezist brand.</p>
        </div>
        {cities.map((city) => (
          <section key={city} className="menu-cat">
            <h2>{city}</h2>
            <div className="branch-grid">
              {branches
                .filter((b) => b.city === city)
                .map((b) => (
                  <article key={b.id} className="branch-card">
                    <h3>{b.name}</h3>
                    <p>{b.address}</p>
                    {b.phone ? <p>{b.phone}</p> : null}
                    <Link href={`/order?branchId=${b.id}`}>Order from this branch →</Link>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}

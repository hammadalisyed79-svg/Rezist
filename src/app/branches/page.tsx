import { prisma } from "@/lib/prisma";
import { SiteShell } from "@/components/SiteShell";
import Link from "next/link";

export default async function BranchesPublicPage() {
  const branches = await prisma.branch.findMany({
    where: { active: true, type: "RETAIL" },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });
  const cities = [...new Set(branches.map((b) => b.city))];

  return (
    <SiteShell cities={cities}>
      <main className="lz-shop-section">
        <div className="lz-shop-head">
          <div>
            <p className="eyebrow">Locations</p>
            <h1>Choose your nearest branch</h1>
            <p className="muted">{cities.join(" · ")}</p>
          </div>
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
                    <div className="lz-branch-actions">
                      <Link className="btn-sm" href={`/order?branchId=${b.id}`}>
                        Order here
                      </Link>
                      <Link className="text-link" href={`/menu?branchId=${b.id}`}>
                        Browse menu →
                      </Link>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </main>
    </SiteShell>
  );
}

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
          <h1>Find Rezist near you</h1>
          <p>{cities.join(" · ")}</p>
        </div>
        <div className="branch-grid">
          {branches.map((b) => (
            <article key={b.id} className="branch-card">
              <h2>{b.name}</h2>
              <p className="city">{b.city}</p>
              <p>{b.address}</p>
              {b.phone ? <p>{b.phone}</p> : null}
              <Link href={`/order?branchId=${b.id}`}>Order from this branch →</Link>
            </article>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

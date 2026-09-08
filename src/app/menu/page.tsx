import { prisma } from "@/lib/prisma";
import { formatPKR } from "@/lib/utils";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import Link from "next/link";

export default async function MenuPage() {
  const categories = await prisma.category.findMany({
    where: { slug: { not: "raw-materials" } },
    include: {
      products: {
        where: { active: true, isPublic: true, isSellable: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="site">
      <SiteHeader />
      <main className="section">
        <div className="section-head">
          <p className="eyebrow">Menu</p>
          <h1>Baked for every branch</h1>
          <p>Prices shown in PKR from the central catalog.</p>
        </div>
        {categories.map((cat) =>
          cat.products.length ? (
            <section key={cat.id} className="menu-cat">
              <h2>{cat.name}</h2>
              <div className="menu-row">
                {cat.products.map((p) => (
                  <article key={p.id} className="menu-item">
                    <h3>{p.name}</h3>
                    <p>{p.description}</p>
                    {p.allergens ? <small>Allergens: {p.allergens}</small> : null}
                    <strong>{formatPKR(p.listPrice)}</strong>
                  </article>
                ))}
              </div>
            </section>
          ) : null
        )}
        <Link className="btn" href="/order">
          Order now
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}

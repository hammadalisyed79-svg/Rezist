import Link from "next/link";
import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { formatPKR } from "@/lib/utils";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { getExpiringLots } from "@/lib/inventory";
import { buildReorderSuggestions } from "@/lib/reorder";

export default async function HqCommandPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "hq")) redirect("/erp");

  const since = new Date();
  since.setDate(since.getDate() - 1);
  const week = new Date();
  week.setDate(week.getDate() - 7);

  const [todaySales, weekSales, pendingOrders, wastageWeek, expiring, reorders, cities] =
    await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: since }, voided: false },
        include: { branch: true },
      }),
      prisma.sale.findMany({
        where: { createdAt: { gte: week }, voided: false },
        include: { branch: true, lines: true },
      }),
      prisma.onlineOrder.findMany({
        where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] } },
        include: { branch: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.wastageRecord.findMany({ where: { createdAt: { gte: week } } }),
      getExpiringLots(undefined, 3),
      buildReorderSuggestions(),
      prisma.branch.findMany({ where: { active: true, type: "RETAIL" } }),
    ]);

  const byCity = new Map<string, { sales: number; txns: number; branches: Set<string> }>();
  for (const s of todaySales) {
    const cur = byCity.get(s.branch.city) || { sales: 0, txns: 0, branches: new Set() };
    cur.sales += s.total;
    cur.txns += 1;
    cur.branches.add(s.branchId);
    byCity.set(s.branch.city, cur);
  }

  const byBranch = new Map<string, { name: string; city: string; total: number; count: number }>();
  for (const s of todaySales) {
    const cur = byBranch.get(s.branchId) || {
      name: s.branch.name,
      city: s.branch.city,
      total: 0,
      count: 0,
    };
    cur.total += s.total;
    cur.count += 1;
    byBranch.set(s.branchId, cur);
  }

  const productTotals = new Map<string, number>();
  for (const s of weekSales) {
    for (const l of s.lines) {
      productTotals.set(l.productId, (productTotals.get(l.productId) || 0) + l.lineTotal);
    }
  }
  const topIds = [...productTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const products = await prisma.product.findMany({ where: { id: { in: topIds.map(([id]) => id) } } });
  const names = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const wastageQty = wastageWeek.reduce((a, w) => a + w.quantity, 0);
  const weekRev = weekSales.reduce((a, s) => a + s.total, 0);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Live HQ</p>
          <h1>Command center</h1>
          <p className="muted">
            {cities.length} retail lounges · last 24h & 7-day pulse
          </p>
        </div>
        <div className="row-actions">
          <Link className="btn" href="/erp/accounting">
            Z-report
          </Link>
          <Link className="btn-sm" href="/erp/reports">
            Full reports
          </Link>
        </div>
      </header>

      <section className="stat-grid">
        <article>
          <span>Today sales</span>
          <strong>{formatPKR(todaySales.reduce((a, s) => a + s.total, 0))}</strong>
        </article>
        <article>
          <span>Today txns</span>
          <strong>{todaySales.length}</strong>
        </article>
        <article>
          <span>Open web orders</span>
          <strong>{pendingOrders.length}</strong>
        </article>
        <article>
          <span>7d wastage qty</span>
          <strong>{wastageQty}</strong>
        </article>
        <article>
          <span>Expiring ≤3d</span>
          <strong>{expiring.length}</strong>
        </article>
        <article>
          <span>Reorder alerts</span>
          <strong>{reorders.length}</strong>
        </article>
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Sales by city (24h)</h2>
          <table>
            <thead>
              <tr>
                <th>City</th>
                <th>Branches</th>
                <th>Txns</th>
                <th>Sales</th>
              </tr>
            </thead>
            <tbody>
              {[...byCity.entries()]
                .sort((a, b) => b[1].sales - a[1].sales)
                .map(([city, v]) => (
                  <tr key={city}>
                    <td>{city}</td>
                    <td>{v.branches.size}</td>
                    <td>{v.txns}</td>
                    <td>{formatPKR(v.sales)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>Branch leaderboard (24h)</h2>
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>City</th>
                <th>Txns</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {[...byBranch.values()]
                .sort((a, b) => b.total - a.total)
                .map((b) => (
                  <tr key={b.name}>
                    <td>{b.name}</td>
                    <td>{b.city}</td>
                    <td>{b.count}</td>
                    <td>{formatPKR(b.total)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Top SKUs (7d) · {formatPKR(weekRev)} revenue</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topIds.map(([id, rev]) => (
                <tr key={id}>
                  <td>{names[id] || id}</td>
                  <td>{formatPKR(rev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>Live kitchen / web queue</h2>
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Branch</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingOrders.slice(0, 12).map((o) => (
                <tr key={o.id}>
                  <td>{o.orderNo}</td>
                  <td>{o.branch.name}</td>
                  <td>
                    <span className={`badge status-${o.status.toLowerCase()}`}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!pendingOrders.length ? <p className="muted">Queue clear.</p> : null}
        </section>
      </div>
    </ErpPage>
  );
}

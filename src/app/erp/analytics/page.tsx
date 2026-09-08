import Link from "next/link";
import { ErpPage, requireErpUser } from "@/lib/erp";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { buildAnalytics } from "@/lib/analytics";
import { formatPKR } from "@/lib/utils";
import { AnalyticsClient } from "@/components/AnalyticsClient";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; branchId?: string }>;
}) {
  const user = await requireErpUser();
  if (!can(user.role as Role, "analytics")) redirect("/erp");

  const sp = await searchParams;
  const days = Number(sp.days || 14);
  const branchId =
    user.role === "HQ_ADMIN" ? sp.branchId || undefined : user.branchId || undefined;

  const data = await buildAnalytics({ days, branchId });
  const maxDaily = Math.max(1, ...data.daily.map((d) => d.sales));
  const maxBranch = Math.max(1, ...data.byBranch.map((b) => b.sales));

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 5</p>
          <h1>Analytics &amp; BI</h1>
          <p className="muted">Trends, branch mix, SKU ranking — company-owned HQ intelligence.</p>
        </div>
        <a className="btn" href={`/api/analytics?days=${days}&format=csv${branchId ? `&branchId=${branchId}` : ""}`}>
          Export CSV
        </a>
      </header>

      <AnalyticsClient days={days} isHq={user.role === "HQ_ADMIN"} />

      <section className="stat-grid">
        <article>
          <span>{days}-day sales</span>
          <strong>{formatPKR(data.saleTotal)}</strong>
        </article>
        <article>
          <span>Transactions</span>
          <strong>{data.saleCount}</strong>
        </article>
        <article>
          <span>Avg ticket</span>
          <strong>{formatPKR(data.avgTicket)}</strong>
        </article>
        <article>
          <span>Loyalty redeemed</span>
          <strong>{data.loyaltyRedeemed} pts</strong>
        </article>
        <article>
          <span>Wastage qty</span>
          <strong>{data.wastageQty}</strong>
        </article>
        <article>
          <span>Open web orders</span>
          <strong>{data.onlineOpen}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Daily sales trend</h2>
        <div className="bi-bars" aria-label="Daily sales">
          {data.daily.map((d) => (
            <div key={d.date} className="bi-bar-col" title={`${d.date}: ${formatPKR(d.sales)}`}>
              <div
                className="bi-bar"
                style={{ height: `${Math.max(4, (d.sales / maxDaily) * 100)}%` }}
              />
              <span>{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>By branch</h2>
          {data.byBranch.length === 0 ? (
            <p className="muted">No sales in period.</p>
          ) : (
            <ul className="bi-rank">
              {data.byBranch.map((b) => (
                <li key={b.branchId}>
                  <div>
                    <strong>{b.name}</strong>
                    <small>
                      {b.city} · {b.txns} txns · avg {formatPKR(b.avgTicket)}
                    </small>
                  </div>
                  <div className="bi-rank-meter">
                    <i style={{ width: `${(b.sales / maxBranch) * 100}%` }} />
                    <span>{formatPKR(b.sales)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="panel">
          <h2>Top SKUs</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topSkus.map((s) => (
                <tr key={s.productId}>
                  <td>{s.name}</td>
                  <td>{s.qty}</td>
                  <td>{formatPKR(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Channel mix · POS {data.channelMix.pos} · Web {data.channelMix.web} · Marketplace{" "}
            {data.channelMix.marketplace} ·{" "}
            <Link className="text-link" href="/erp/reports">
              Classic reports →
            </Link>
          </p>
        </section>
      </div>
    </ErpPage>
  );
}

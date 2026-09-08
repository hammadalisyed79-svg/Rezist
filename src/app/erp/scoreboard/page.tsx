import { ErpPage, requireErpUser } from "@/lib/erp";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { buildBranchScoreboard } from "@/lib/scoreboard";
import { formatPKR } from "@/lib/utils";
import Link from "next/link";

export default async function ScoreboardPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "scoreboard")) redirect("/erp");

  const rows = await buildBranchScoreboard(7);
  const maxScore = Math.max(1, ...rows.map((r) => r.score));

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 6</p>
          <h1>Branch scoreboard</h1>
          <p className="muted">
            Company-owned multi-branch KPIs — sales, waste, stockouts, overdue transfers (7 days).
          </p>
        </div>
        <Link className="btn" href="/erp/exports">
          Export packs
        </Link>
      </header>

      <section className="stat-grid compact">
        <article>
          <span>Branches</span>
          <strong>{rows.length}</strong>
        </article>
        <article>
          <span>Network sales</span>
          <strong>{formatPKR(rows.reduce((a, r) => a + r.sales, 0))}</strong>
        </article>
        <article>
          <span>Avg score</span>
          <strong>
            {rows.length ? Math.round(rows.reduce((a, r) => a + r.score, 0) / rows.length) : 0}
          </strong>
        </article>
      </section>

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Branch</th>
              <th>Score</th>
              <th>Sales</th>
              <th>Txns</th>
              <th>Waste</th>
              <th>Low stock</th>
              <th>Overdue TF</th>
              <th>Open orders</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.branchId}>
                <td>{i + 1}</td>
                <td>
                  {r.name}
                  <br />
                  <small className="muted">{r.city}</small>
                </td>
                <td>
                  <div className="bi-rank-meter" style={{ flex: "none", width: 100 }}>
                    <i style={{ width: `${(r.score / maxScore) * 100}%` }} />
                    <span>{r.score}</span>
                  </div>
                </td>
                <td>{formatPKR(r.sales)}</td>
                <td>{r.txns}</td>
                <td>
                  {r.wastageQty}
                  {r.wastageCost ? (
                    <>
                      <br />
                      <small className="muted">{formatPKR(r.wastageCost)}</small>
                    </>
                  ) : null}
                </td>
                <td>{r.lowStock}</td>
                <td>{r.overdueTransfers || "—"}</td>
                <td>{r.openOrders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ErpPage>
  );
}

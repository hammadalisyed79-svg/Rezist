import { ErpPage, requireErpUser } from "@/lib/erp";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { buildSupplierScorecards } from "@/lib/suppliers";
import { formatPKR } from "@/lib/utils";
import Link from "next/link";

export default async function SuppliersPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "suppliers")) redirect("/erp");

  const rows = await buildSupplierScorecards(90);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 6</p>
          <h1>Supplier scorecards</h1>
          <p className="muted">
            Purchase performance — on-time GRN, fill rate, spend (90 days). Company-owned supply chain.
          </p>
        </div>
        <Link className="btn" href="/erp/purchases">
          Purchases / GRN
        </Link>
      </header>

      <section className="panel">
        {rows.length === 0 ? (
          <p className="muted">No supplier POs in window. Create purchases first.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Score</th>
                <th>POs</th>
                <th>On-time %</th>
                <th>Fill rate</th>
                <th>Avg lead (d)</th>
                <th>Spend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.supplierId}>
                  <td>
                    {r.name}
                    <br />
                    <small className="muted">
                      {r.code}
                      {r.city ? ` · ${r.city}` : ""}
                    </small>
                  </td>
                  <td>
                    <span className="badge status-ready">{r.score}</span>
                  </td>
                  <td>
                    {r.poCount} / {r.receivedCount} recv
                  </td>
                  <td>{r.onTimePct}%</td>
                  <td>{r.fillRatePct}%</td>
                  <td>{r.avgLeadDays}</td>
                  <td>{formatPKR(r.totalSpend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </ErpPage>
  );
}

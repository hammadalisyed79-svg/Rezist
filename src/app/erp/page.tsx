import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPKR } from "@/lib/utils";
import { ErpPage, requireErpUser } from "@/lib/erp";
import { getExpiringLots } from "@/lib/inventory";
import { getProductCosting } from "@/lib/costing";
import { buildReorderSuggestions } from "@/lib/reorder";

export default async function ErpDashboard() {
  const user = await requireErpUser();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const branchFilter =
    user.role === "HQ_ADMIN" ? undefined : { branchId: user.branchId || undefined };

  const [saleAgg, branchCount, lowStock, pendingOrders, expiring, costing, reorders] =
    await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: since }, voided: false, ...branchFilter },
        select: { total: true },
      }),
      prisma.branch.count({ where: { active: true, type: "RETAIL" } }),
      prisma.inventoryItem.findMany({
        where: {
          ...(user.role === "HQ_ADMIN" ? {} : { branchId: user.branchId || undefined }),
          product: { trackStock: true },
        },
        include: { product: true, branch: true },
        take: 200,
      }),
      prisma.onlineOrder.count({
        where: { status: "PENDING", ...branchFilter },
      }),
      getExpiringLots(user.role === "HQ_ADMIN" ? undefined : user.branchId || undefined, 3),
      user.role === "CASHIER" ? Promise.resolve([]) : getProductCosting(),
      user.role === "CASHIER"
        ? Promise.resolve([])
        : buildReorderSuggestions().then((s) =>
            user.role === "HQ_ADMIN" ? s : s.filter((x) => x.branchId === user.branchId)
          ),
    ]);

  const revenue = saleAgg.reduce((a, s) => a + s.total, 0);
  const stockAlerts = lowStock
    .filter((i) => i.quantity - (i.reservedQty || 0) <= i.reorderLevel)
    .slice(0, 8);
  const lowMargin = costing.filter((c) => c.lowMargin).slice(0, 5);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Dashboard</h1>
        </div>
        <Link className="btn" href="/erp/pos">
          Open POS
        </Link>
      </header>

      <section className="stat-grid">
        <article>
          <span>7-day sales</span>
          <strong>{formatPKR(revenue)}</strong>
        </article>
        <article>
          <span>Transactions</span>
          <strong>{saleAgg.length}</strong>
        </article>
        <article>
          <span>Retail branches</span>
          <strong>{branchCount}</strong>
        </article>
        <article>
          <span>Pending web orders</span>
          <strong>{pendingOrders}</strong>
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

      <section className="panel">
        <div className="lz-shop-head">
          <h2>Phase 5 shortcuts</h2>
        </div>
        <p className="muted">
          <Link className="text-link" href="/erp/analytics">
            Analytics
          </Link>
          {" · "}
          <Link className="text-link" href="/erp/scoreboard">
            Scoreboard
          </Link>
          {" · "}
          <Link className="text-link" href="/erp/forecast">
            Forecast
          </Link>
          {" · "}
          <Link className="text-link" href="/erp/alerts">
            Alerts
          </Link>
          {" · "}
          <Link className="text-link" href="/erp/quality">
            Food safety
          </Link>
          {" · "}
          <Link className="text-link" href="/erp/handover">
            Handover
          </Link>
          {" · "}
          <Link className="text-link" href="/erp/exports">
            Exports
          </Link>
        </p>
      </section>

      <section className="panel">
        <div className="lz-shop-head">
          <h2>Low stock</h2>
          <Link className="text-link" href="/erp/reorder">
            Reorder →
          </Link>
        </div>
        {stockAlerts.length === 0 ? (
          <p className="muted">All tracked items are above reorder level.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Product</th>
                <th>Avail</th>
                <th>Reorder</th>
              </tr>
            </thead>
            <tbody>
              {stockAlerts.map((i) => (
                <tr key={i.id}>
                  <td>{i.branch.name}</td>
                  <td>{i.product.name}</td>
                  <td>{i.quantity - (i.reservedQty || 0)}</td>
                  <td>{i.reorderLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {expiring.length ? (
        <section className="panel">
          <h2>FEFO · expiring soon</h2>
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Product</th>
                <th>Lot</th>
                <th>Qty</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {expiring.slice(0, 8).map((l) => (
                <tr key={l.id} className="warn-row">
                  <td>{l.branch.name}</td>
                  <td>{l.product.name}</td>
                  <td>{l.lotNo}</td>
                  <td>{l.quantity}</td>
                  <td>{l.expiryDate ? l.expiryDate.toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {lowMargin.length ? (
        <section className="panel">
          <div className="lz-shop-head">
            <h2>Low margin products</h2>
            <Link className="text-link" href="/erp/costing">
              Costing →
            </Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Sell</th>
                <th>Cost</th>
                <th>Margin %</th>
              </tr>
            </thead>
            <tbody>
              {lowMargin.map((r) => (
                <tr key={r.productId} className="warn-row">
                  <td>{r.name}</td>
                  <td>{formatPKR(r.listPrice)}</td>
                  <td>{formatPKR(r.effectiveCost)}</td>
                  <td>{r.marginPct.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </ErpPage>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPKR } from "@/lib/utils";
import { ErpPage, requireErpUser } from "@/lib/erp";

export default async function ErpDashboard() {
  const user = await requireErpUser();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const branchFilter =
    user.role === "HQ_ADMIN" ? undefined : { branchId: user.branchId || undefined };

  const [saleAgg, branchCount, lowStock, pendingOrders] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: since }, ...branchFilter },
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
  ]);

  const revenue = saleAgg.reduce((a, s) => a + s.total, 0);
  const stockAlerts = lowStock.filter((i) => i.quantity <= i.reorderLevel).slice(0, 8);

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
      </section>

      <section className="panel">
        <h2>Low stock alerts</h2>
        {stockAlerts.length === 0 ? (
          <p className="muted">All tracked items are above reorder level.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Reorder</th>
              </tr>
            </thead>
            <tbody>
              {stockAlerts.map((i) => (
                <tr key={i.id}>
                  <td>{i.branch.name}</td>
                  <td>{i.product.name}</td>
                  <td>{i.quantity}</td>
                  <td>{i.reorderLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </ErpPage>
  );
}

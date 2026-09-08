import { redirect } from "next/navigation";
import { ErpPage, requireErpUser } from "@/lib/erp";
import { formatPKR } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const user = await requireErpUser();
  if (user.role === "CASHIER") redirect("/erp");

  const days = 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const branchFilter =
    user.role === "HQ_ADMIN" ? undefined : { branchId: user.branchId || undefined };

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: since }, ...branchFilter },
    include: { branch: true, lines: true },
  });

  const byBranch = new Map<string, { branch: string; city: string; total: number; count: number }>();
  for (const sale of sales) {
    const cur = byBranch.get(sale.branchId) || {
      branch: sale.branch.name,
      city: sale.branch.city,
      total: 0,
      count: 0,
    };
    cur.total += sale.total;
    cur.count += 1;
    byBranch.set(sale.branchId, cur);
  }

  const productTotals = new Map<string, { id: string; qty: number; revenue: number }>();
  for (const sale of sales) {
    for (const line of sale.lines) {
      const cur = productTotals.get(line.productId) || { id: line.productId, qty: 0, revenue: 0 };
      cur.qty += line.quantity;
      cur.revenue += line.lineTotal;
      productTotals.set(line.productId, cur);
    }
  }
  const products = await prisma.product.findMany({
    where: { id: { in: [...productTotals.keys()] } },
  });
  const names = Object.fromEntries(products.map((p) => [p.id, p.name]));
  const topSkus = [...productTotals.values()]
    .map((p) => ({ name: names[p.id], qty: p.qty, revenue: p.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const wastage = await prisma.wastageRecord.findMany({
    where: { createdAt: { gte: since }, ...branchFilter },
  });

  const lowStock = await prisma.inventoryItem.findMany({
    where: {
      ...(user.role === "HQ_ADMIN" ? {} : { branchId: user.branchId || undefined }),
      product: { trackStock: true },
    },
    include: { product: true, branch: true },
  });
  const alerts = lowStock.filter((i) => i.quantity <= i.reorderLevel);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">HQ intelligence</p>
          <h1>Reports — last {days} days</h1>
        </div>
      </header>

      <section className="stat-grid">
        <article>
          <span>Sales total</span>
          <strong>{formatPKR(sales.reduce((a, s) => a + s.total, 0))}</strong>
        </article>
        <article>
          <span>Transactions</span>
          <strong>{sales.length}</strong>
        </article>
        <article>
          <span>Wastage qty</span>
          <strong>{wastage.reduce((a, w) => a + w.quantity, 0)}</strong>
        </article>
        <article>
          <span>Low stock SKUs</span>
          <strong>{alerts.length}</strong>
        </article>
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Sales by branch</h2>
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
                .map((r) => (
                  <tr key={r.branch}>
                    <td>{r.branch}</td>
                    <td>{r.city}</td>
                    <td>{r.count}</td>
                    <td>{formatPKR(r.total)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
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
              {topSkus.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td>{s.qty}</td>
                  <td>{formatPKR(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="panel">
        <h2>Stockouts / reorder alerts</h2>
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
            {alerts.slice(0, 25).map((i) => (
              <tr key={i.id}>
                <td>{i.branch.name}</td>
                <td>{i.product.name}</td>
                <td>{i.quantity}</td>
                <td>{i.reorderLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ErpPage>
  );
}

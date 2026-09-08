"use client";

type Row = {
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku: string;
  avgDailyQty: number;
  trendPct: number;
  suggestedBakeQty: number;
  onHand: number;
  gap: number;
};

export function ForecastClient({ rows }: { rows: Row[] }) {
  const gaps = rows.filter((r) => r.gap > 0);

  return (
    <>
      <section className="stat-grid compact">
        <article>
          <span>SKUs tracked</span>
          <strong>{rows.length}</strong>
        </article>
        <article>
          <span>Bake gaps</span>
          <strong>{gaps.length}</strong>
        </article>
        <article>
          <span>Units to bake</span>
          <strong>{gaps.reduce((a, r) => a + r.gap, 0)}</strong>
        </article>
      </section>

      <section className="panel">
        <h2>Tomorrow&apos;s suggested bake</h2>
        {rows.length === 0 ? (
          <p className="muted">Need recent POS sales to forecast. Ring a few sales first.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Product</th>
                <th>Avg/day</th>
                <th>Trend</th>
                <th>Suggest</th>
                <th>On hand</th>
                <th>Gap</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 40).map((r) => (
                <tr key={`${r.branchId}-${r.productId}`}>
                  <td>{r.branchName}</td>
                  <td>
                    {r.productName}
                    <br />
                    <small className="muted">{r.sku}</small>
                  </td>
                  <td>{r.avgDailyQty}</td>
                  <td>
                    <span className={r.trendPct >= 0 ? "badge status-ready" : "badge status-void"}>
                      {r.trendPct >= 0 ? "+" : ""}
                      {r.trendPct}%
                    </span>
                  </td>
                  <td>{r.suggestedBakeQty}</td>
                  <td>{r.onHand}</td>
                  <td>
                    {r.gap > 0 ? (
                      <strong style={{ color: "var(--err)" }}>{r.gap}</strong>
                    ) : (
                      <span className="muted">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

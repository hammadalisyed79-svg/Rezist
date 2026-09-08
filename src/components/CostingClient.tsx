"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPKR } from "@/lib/utils";

type Row = {
  productId: string;
  name: string;
  sku: string;
  listPrice: number;
  recipeCost: number;
  effectiveCost: number;
  margin: number;
  marginPct: number;
  lowMargin: boolean;
  missingRecipe: boolean;
};

export function CostingClient({ rows, isHq }: { rows: Row[]; isHq: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function sync() {
    const res = await fetch("/api/costing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "syncCosts" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Sync failed");
      return;
    }
    setMsg(`Updated costPrice on ${data.updated} products`);
    router.refresh();
  }

  return (
    <>
      {isHq ? (
        <div className="panel form-inline">
          <p className="muted">Push live recipe costs into product costPrice fields.</p>
          <button type="button" className="btn" onClick={sync}>
            Sync costs from BOM
          </button>
        </div>
      ) : null}
      {msg ? <p className="success">{msg}</p> : null}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Sell</th>
              <th>Recipe cost</th>
              <th>Margin</th>
              <th>%</th>
              <th>Alert</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId} className={r.lowMargin ? "warn-row" : undefined}>
                <td>
                  {r.name}
                  <br />
                  <small>{r.sku}</small>
                </td>
                <td>{formatPKR(r.listPrice)}</td>
                <td>{r.missingRecipe ? "—" : formatPKR(r.recipeCost)}</td>
                <td>{formatPKR(r.margin)}</td>
                <td>{r.marginPct.toFixed(0)}%</td>
                <td>
                  {r.missingRecipe ? (
                    <span className="badge">No recipe</span>
                  ) : r.lowMargin ? (
                    <span className="badge status-cancelled">Low margin</span>
                  ) : (
                    <span className="badge status-completed">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

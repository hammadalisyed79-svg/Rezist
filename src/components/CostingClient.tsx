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
  ingredients: { name: string; qty: number; unitCost: number; lineCost: number }[];
};

type Ingredient = { id: string; name: string; costPrice: number };

export function CostingClient({
  rows,
  isHq,
  ingredients,
}: {
  rows: Row[];
  isHq: boolean;
  ingredients: Ingredient[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [bom, setBom] = useState<{ ingredientId: string; quantity: number }[]>([
    { ingredientId: "", quantity: 0.1 },
  ]);

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

  function openEdit(row: Row) {
    setEditId(row.productId);
    setBom(
      row.ingredients.length
        ? row.ingredients.map((i) => ({
            ingredientId: ingredients.find((x) => x.name === i.name)?.id || "",
            quantity: i.qty,
          }))
        : [{ ingredientId: ingredients[0]?.id || "", quantity: 0.1 }]
    );
  }

  async function saveBom() {
    if (!editId) return;
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: editId, lines: bom }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "BOM save failed");
      return;
    }
    setMsg("Recipe updated");
    setEditId(null);
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

      {editId ? (
        <section className="panel">
          <h2>Edit recipe / BOM</h2>
          {bom.map((line, idx) => (
            <div key={idx} className="form-inline" style={{ marginBottom: 8 }}>
              <select
                value={line.ingredientId}
                onChange={(e) => {
                  const next = [...bom];
                  next[idx] = { ...next[idx], ingredientId: e.target.value };
                  setBom(next);
                }}
              >
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} (cost {i.costPrice})
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                value={line.quantity}
                onChange={(e) => {
                  const next = [...bom];
                  next[idx] = { ...next[idx], quantity: Number(e.target.value) };
                  setBom(next);
                }}
              />
            </div>
          ))}
          <div className="row-actions">
            <button
              type="button"
              className="btn-sm"
              onClick={() => setBom([...bom, { ingredientId: ingredients[0]?.id || "", quantity: 0.1 }])}
            >
              Add line
            </button>
            <button type="button" className="btn" onClick={saveBom}>
              Save BOM
            </button>
            <button type="button" className="btn-sm" onClick={() => setEditId(null)}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}

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
              <th />
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
                <td>
                  <button type="button" className="btn-sm" onClick={() => openEdit(r)}>
                    Edit BOM
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

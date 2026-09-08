"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Batch = {
  id: string;
  batchNo: string;
  status: string;
  plannedDate: string | Date;
  notes?: string | null;
  branch: { name: string };
  lines: { id: string; plannedQty: number; actualQty: number; product: { name: string } }[];
};

export function ProductionClient({
  branches,
  products,
  batches,
  canManage,
  defaultBranchId,
}: {
  branches: { id: string; name: string }[];
  products: { id: string; name: string }[];
  batches: Batch[];
  canManage: boolean;
  defaultBranchId?: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId: fd.get("branchId"),
        notes: fd.get("notes"),
        reserve: true,
        lines: [
          {
            productId: fd.get("productId"),
            plannedQty: Number(fd.get("plannedQty")),
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Batch ${data.batch.batchNo} · ${data.batch.status} (ingredients reserved)`);
    router.refresh();
  }

  async function planFromDemand() {
    setMsg("");
    const res = await fetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "planFromDemand",
        branchId: defaultBranchId,
        days: 7,
        coverDays: 2,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Demand plan failed");
      return;
    }
    setMsg(`Demand plan ${data.batch.batchNo} created with reserved ingredients`);
    router.refresh();
  }

  async function complete(batch: Batch) {
    const res = await fetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "complete",
        batchId: batch.id,
        actuals: batch.lines.map((l) => ({ lineId: l.id, actualQty: l.plannedQty })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Complete failed");
      return;
    }
    setMsg("Batch completed — finished goods added with 48h expiry lot");
    router.refresh();
  }

  return (
    <>
      {canManage ? (
        <>
          <div className="panel form-inline">
            <h2>Smart bake plan</h2>
            <p className="muted">Build kitchen plan from last 7 days retail demand and reserve raw materials.</p>
            <button type="button" className="btn" onClick={planFromDemand}>
              Plan from demand
            </button>
          </div>
          <form className="panel form-inline" onSubmit={create}>
            <h2>Manual batch</h2>
            <label>
              Kitchen / branch
              <select name="branchId" defaultValue={defaultBranchId} required>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Product
              <select name="productId" required>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Planned qty
              <input name="plannedQty" type="number" min="1" defaultValue={50} required />
            </label>
            <label>
              Notes
              <input name="notes" placeholder="Morning bake" />
            </label>
            <button className="btn" type="submit">
              Reserve & plan
            </button>
          </form>
        </>
      ) : null}
      {msg ? <p className={msg.toLowerCase().includes("fail") ? "error" : "success"}>{msg}</p> : null}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Batch</th>
              <th>Location</th>
              <th>Lines</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td>
                  {b.batchNo}
                  {b.notes ? (
                    <>
                      <br />
                      <small>{b.notes}</small>
                    </>
                  ) : null}
                </td>
                <td>{b.branch.name}</td>
                <td>
                  {b.lines.map((l) => `${l.product.name} × ${l.plannedQty}`).join(", ")}
                </td>
                <td>
                  <span className={`badge status-${b.status.toLowerCase()}`}>{b.status}</span>
                </td>
                <td>
                  {canManage && b.status !== "COMPLETED" ? (
                    <button type="button" className="btn-sm" onClick={() => complete(b)}>
                      Complete
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Batch = {
  id: string;
  batchNo: string;
  status: string;
  plannedDate: string | Date;
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
    setMsg(`Batch ${data.batch.batchNo} planned`);
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
    setMsg("Batch completed — stock updated from recipe");
    router.refresh();
  }

  return (
    <>
      {canManage ? (
        <form className="panel form-inline" onSubmit={create}>
          <h2>Plan production</h2>
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
            Create batch
          </button>
        </form>
      ) : null}
      {msg ? <p className="success">{msg}</p> : null}
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
                <td>{b.batchNo}</td>
                <td>{b.branch.name}</td>
                <td>
                  {b.lines.map((l) => `${l.product.name} × ${l.plannedQty}`).join(", ")}
                </td>
                <td>{b.status}</td>
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

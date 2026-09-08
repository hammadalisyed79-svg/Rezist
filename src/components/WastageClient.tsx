"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WastageClient({
  products,
  records,
  branches,
  defaultBranchId,
  role,
}: {
  products: { id: string; name: string }[];
  records: {
    id: string;
    quantity: number;
    reason: string;
    createdAt: string | Date;
    product: { name: string };
    branch: { name: string };
  }[];
  branches: { id: string; name: string }[];
  defaultBranchId?: string;
  role: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/wastage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId: fd.get("branchId"),
        productId: fd.get("productId"),
        quantity: Number(fd.get("quantity")),
        reason: fd.get("reason"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg("Wastage recorded");
    router.refresh();
  }

  return (
    <>
      <form className="panel form-inline" onSubmit={onSubmit}>
        <h2>Record wastage</h2>
        {role === "HQ_ADMIN" ? (
          <label>
            Branch
            <select name="branchId" defaultValue={defaultBranchId} required>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="branchId" value={defaultBranchId || ""} />
        )}
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
          Qty
          <input name="quantity" type="number" min="0.01" step="0.01" required />
        </label>
        <label>
          Reason
          <input name="reason" defaultValue="Unsold end of day" required />
        </label>
        <button className="btn" type="submit">
          Save
        </button>
      </form>
      {msg ? <p className={msg.includes("Failed") || msg.includes("stock") ? "error" : "success"}>{msg}</p> : null}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Branch</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.branch.name}</td>
                <td>{r.product.name}</td>
                <td>{r.quantity}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Branch = { id: string; name: string; type: string };
type Product = { id: string; name: string };
type Transfer = {
  id: string;
  transferNo: string;
  status: string;
  fromBranch: { name: string };
  toBranch: { name: string; id: string };
  lines: { quantity: number; product: { name: string } }[];
};

export function TransferClient({
  branches,
  products,
  transfers,
  canCreate,
  userBranchId,
  role,
}: {
  branches: Branch[];
  products: Product[];
  transfers: Transfer[];
  canCreate: boolean;
  userBranchId: string | null;
  role: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const warehouses = branches.filter((b) => b.type !== "RETAIL" || true);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromBranchId: fd.get("fromBranchId"),
        toBranchId: fd.get("toBranchId"),
        notes: fd.get("notes"),
        lines: [
          {
            productId: fd.get("productId"),
            quantity: Number(fd.get("quantity")),
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Created ${data.transfer.transferNo}`);
    router.refresh();
  }

  async function receive(id: string) {
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "receive", transferId: id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Receive failed");
      return;
    }
    setMsg("Transfer received into stock");
    router.refresh();
  }

  return (
    <>
      {canCreate ? (
        <form className="panel form-inline" onSubmit={create}>
          <h2>New transfer</h2>
          <label>
            From
            <select name="fromBranchId" required defaultValue={warehouses.find((b) => b.type === "WAREHOUSE")?.id}>
              {warehouses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            To
            <select name="toBranchId" required>
              {branches
                .filter((b) => b.type === "RETAIL")
                .map((b) => (
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
            Qty
            <input name="quantity" type="number" min="1" step="1" defaultValue={20} required />
          </label>
          <label>
            Notes
            <input name="notes" placeholder="Optional" />
          </label>
          <button className="btn" type="submit">
            Dispatch
          </button>
        </form>
      ) : null}
      {msg ? <p className="success">{msg}</p> : null}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Transfer</th>
              <th>From</th>
              <th>To</th>
              <th>Lines</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id}>
                <td>{t.transferNo}</td>
                <td>{t.fromBranch.name}</td>
                <td>{t.toBranch.name}</td>
                <td>
                  {t.lines.map((l) => `${l.product.name} × ${l.quantity}`).join(", ")}
                </td>
                <td>{t.status}</td>
                <td>
                  {t.status === "IN_TRANSIT" &&
                  (role === "HQ_ADMIN" || userBranchId === t.toBranch.id) ? (
                    <button type="button" className="btn-sm" onClick={() => receive(t.id)}>
                      Receive
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

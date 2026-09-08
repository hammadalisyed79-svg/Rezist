"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Suggestion = {
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
  shortage: number;
  suggestQty: number;
  action: "TRANSFER" | "PURCHASE";
  fromBranchId?: string;
  fromBranchName?: string;
};

export function ReorderClient({ suggestions }: { suggestions: Suggestion[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function createTransfer(s: Suggestion) {
    if (!s.fromBranchId) return;
    const res = await fetch("/api/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createTransfer",
        fromBranchId: s.fromBranchId,
        toBranchId: s.branchId,
        productId: s.productId,
        quantity: s.suggestQty,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Transfer failed");
      return;
    }
    setMsg(`Draft ${data.transfer.transferNo} — ship from Transfers`);
    router.refresh();
  }

  async function createPO(s: Suggestion) {
    const res = await fetch("/api/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createPO",
        branchId: s.branchId,
        productId: s.productId,
        quantity: s.suggestQty,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "PO failed");
      return;
    }
    setMsg(`Created ${data.purchase.poNo} — receive GRN in Purchases`);
    router.refresh();
  }

  return (
    <>
      {msg ? <p className="success">{msg}</p> : null}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Branch</th>
              <th>Product</th>
              <th>On hand</th>
              <th>Reorder at</th>
              <th>Suggest</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((s) => (
              <tr key={`${s.branchId}-${s.productId}`}>
                <td>{s.branchName}</td>
                <td>
                  {s.productName}
                  <br />
                  <small>{s.sku}</small>
                </td>
                <td>{s.quantity}</td>
                <td>{s.reorderLevel}</td>
                <td>{s.suggestQty}</td>
                <td className="row-actions">
                  {s.action === "TRANSFER" && s.fromBranchId ? (
                    <button type="button" className="btn-sm" onClick={() => createTransfer(s)}>
                      Draft transfer from {s.fromBranchName}
                    </button>
                  ) : (
                    <button type="button" className="btn-sm" onClick={() => createPO(s)}>
                      Create PO
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!suggestions.length ? <p className="muted">No reorder alerts — stock is healthy.</p> : null}
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
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
    setMsg(`Shipped ${data.transfer.transferNo} — receive at branch`);
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
                      Transfer from {s.fromBranchName}
                    </button>
                  ) : (
                    <Link className="btn-sm" href="/erp/purchases">
                      Create PO
                    </Link>
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

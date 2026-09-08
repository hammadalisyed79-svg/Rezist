"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatPKR } from "@/lib/utils";

type Branch = { id: string; name: string; type: string };
type Product = { id: string; name: string; costPrice: number };
type Supplier = { id: string; code: string; name: string; phone: string | null };
type Purchase = {
  id: string;
  poNo: string;
  status: string;
  total: number;
  supplier: { name: string };
  branch: { name: string };
  lines: {
    id: string;
    quantity: number;
    receivedQty: number;
    unitCost: number;
    product: { name: string };
  }[];
};

export function PurchaseClient({
  branches,
  products,
  suppliers,
  purchases,
  defaultBranchId,
  isHq,
}: {
  branches: Branch[];
  products: Product[];
  suppliers: Supplier[];
  purchases: Purchase[];
  defaultBranchId: string;
  isHq: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [recvQty, setRecvQty] = useState<Record<string, number>>({});

  const receiving = useMemo(
    () => purchases.find((p) => p.id === receiveId) || null,
    [purchases, receiveId]
  );

  async function createSupplier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createSupplier",
        name: fd.get("name"),
        code: fd.get("code"),
        phone: fd.get("phone"),
        city: fd.get("city"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Supplier failed");
      return;
    }
    setMsg(`Supplier ${data.supplier.name} added`);
    e.currentTarget.reset();
    router.refresh();
  }

  async function createPo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: fd.get("supplierId"),
        branchId: fd.get("branchId"),
        notes: fd.get("notes"),
        lines: [
          {
            productId: fd.get("productId"),
            quantity: Number(fd.get("quantity")),
            unitCost: Number(fd.get("unitCost")),
          },
        ],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "PO failed");
      return;
    }
    setMsg(`Created ${data.purchase.poNo}`);
    router.refresh();
  }

  function openReceive(p: Purchase) {
    const seed: Record<string, number> = {};
    for (const l of p.lines) seed[l.id] = Math.max(0, l.quantity - l.receivedQty);
    setRecvQty(seed);
    setReceiveId(p.id);
  }

  async function receive() {
    if (!receiving) return;
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "receive",
        purchaseId: receiving.id,
        lines: receiving.lines.map((l) => ({
          lineId: l.id,
          receivedQty: Number(recvQty[l.id] || 0),
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "GRN failed");
      return;
    }
    setMsg("GRN posted — stock updated");
    setReceiveId(null);
    router.refresh();
  }

  return (
    <>
      {isHq ? (
        <form className="panel form-inline" onSubmit={createSupplier}>
          <h2>New supplier</h2>
          <label>
            Code
            <input name="code" placeholder="SUP-01" />
          </label>
          <label>
            Name
            <input name="name" required placeholder="Dairy supplier" />
          </label>
          <label>
            Phone
            <input name="phone" />
          </label>
          <label>
            City
            <input name="city" />
          </label>
          <button className="btn" type="submit">
            Add supplier
          </button>
        </form>
      ) : null}

      <form className="panel form-inline" onSubmit={createPo}>
        <h2>Purchase order</h2>
        <label>
          Supplier
          <select name="supplierId" required>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Receive into branch
          <select name="branchId" required defaultValue={defaultBranchId}>
            {branches
              .filter((b) => b.type !== "RETAIL" || isHq)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.type})
                </option>
              ))}
          </select>
        </label>
        <label>
          Raw / packaging
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
          <input name="quantity" type="number" min="1" step="1" defaultValue={50} required />
        </label>
        <label>
          Unit cost
          <input name="unitCost" type="number" min="0" step="0.01" defaultValue={100} required />
        </label>
        <label>
          Notes
          <input name="notes" />
        </label>
        <button className="btn" type="submit">
          Create PO
        </button>
      </form>

      {msg ? <p className="success">{msg}</p> : null}

      {receiving ? (
        <section className="panel">
          <h2>GRN · {receiving.poNo}</h2>
          {receiving.lines.map((l) => (
            <label key={l.id}>
              {l.product.name} (ordered {l.quantity}, already {l.receivedQty})
              <input
                type="number"
                min="0"
                step="1"
                value={recvQty[l.id] ?? 0}
                onChange={(e) => setRecvQty((q) => ({ ...q, [l.id]: Number(e.target.value) }))}
              />
            </label>
          ))}
          <div className="row-actions">
            <button type="button" className="btn" onClick={receive}>
              Post goods receipt
            </button>
            <button type="button" className="btn-sm" onClick={() => setReceiveId(null)}>
              Close
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <h2>Open & recent POs</h2>
        <table>
          <thead>
            <tr>
              <th>PO</th>
              <th>Supplier</th>
              <th>Branch</th>
              <th>Lines</th>
              <th>Total</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td>{p.poNo}</td>
                <td>{p.supplier.name}</td>
                <td>{p.branch.name}</td>
                <td>
                  {p.lines
                    .map((l) => `${l.product.name} × ${l.quantity} (recv ${l.receivedQty})`)
                    .join(", ")}
                </td>
                <td>{formatPKR(p.total)}</td>
                <td>
                  <span className={`badge status-${p.status.toLowerCase()}`}>{p.status}</span>
                </td>
                <td>
                  {["ORDERED", "PARTIAL"].includes(p.status) ? (
                    <button type="button" className="btn-sm" onClick={() => openReceive(p)}>
                      Receive GRN
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!purchases.length ? <p className="muted">No purchase orders yet.</p> : null}
        {!suppliers.length ? <p className="muted">Add a supplier first (HQ).</p> : null}
      </section>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Branch = { id: string; name: string; type: string };
type Product = { id: string; name: string };
type Transfer = {
  id: string;
  transferNo: string;
  status: string;
  fromBranch: { name: string; id: string };
  toBranch: { name: string; id: string };
  lines: {
    id: string;
    quantity: number;
    shippedQty: number;
    receivedQty: number;
    product: { name: string };
  }[];
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
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [recvQty, setRecvQty] = useState<Record<string, number>>({});

  const receiving = useMemo(
    () => transfers.find((t) => t.id === receiveId) || null,
    [transfers, receiveId]
  );

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
        autoShip: fd.get("autoShip") === "on",
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
    setMsg(`${data.transfer.transferNo} · ${data.transfer.status}`);
    router.refresh();
  }

  async function ship(id: string) {
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ship", transferId: id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Ship failed");
      return;
    }
    setMsg("Shipped — stock left source branch");
    router.refresh();
  }

  async function receive() {
    if (!receiving) return;
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "receive",
        transferId: receiving.id,
        lines: receiving.lines.map((l) => ({
          lineId: l.id,
                  receivedQty: Number(recvQty[l.id] ?? (l.shippedQty || l.quantity)),
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Receive failed");
      return;
    }
    setMsg(
      data.variances?.length
        ? `Received with variance (${data.variances.length} lines)`
        : "Transfer received into stock"
    );
    setReceiveId(null);
    router.refresh();
  }

  function openReceive(t: Transfer) {
    const seed: Record<string, number> = {};
    for (const l of t.lines) seed[l.id] = l.shippedQty || l.quantity;
    setRecvQty(seed);
    setReceiveId(t.id);
  }

  return (
    <>
      {canCreate ? (
        <form className="panel form-inline" onSubmit={create}>
          <h2>New transfer</h2>
          <label>
            From
            <select
              name="fromBranchId"
              required
              defaultValue={branches.find((b) => b.type === "WAREHOUSE")?.id || userBranchId || ""}
            >
              {branches.map((b) => (
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
          <label className="check">
            <input name="autoShip" type="checkbox" defaultChecked />
            Ship immediately (deduct stock)
          </label>
          <button className="btn" type="submit">
            Create transfer
          </button>
        </form>
      ) : null}
      {msg ? <p className="success">{msg}</p> : null}

      {receiving ? (
        <section className="panel">
          <h2>Receive {receiving.transferNo}</h2>
          <p className="muted">Enter actual received qty (variance is logged).</p>
          {receiving.lines.map((l) => (
            <label key={l.id}>
              {l.product.name} (shipped {l.shippedQty || l.quantity})
              <input
                type="number"
                min="0"
                step="1"
                value={recvQty[l.id] ?? (l.shippedQty || l.quantity)}
                onChange={(e) => setRecvQty((q) => ({ ...q, [l.id]: Number(e.target.value) }))}
              />
            </label>
          ))}
          <div className="row-actions">
            <button type="button" className="btn" onClick={receive}>
              Confirm GRN receive
            </button>
            <button type="button" className="btn-sm" onClick={() => setReceiveId(null)}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}

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
                  {t.lines
                    .map(
                      (l) =>
                        `${l.product.name} × ${l.quantity}` +
                        (l.shippedQty ? ` (ship ${l.shippedQty})` : "") +
                        (l.receivedQty ? ` (recv ${l.receivedQty})` : "")
                    )
                    .join(", ")}
                </td>
                <td>
                  <span className={`badge status-${t.status.toLowerCase()}`}>{t.status}</span>
                </td>
                <td className="row-actions">
                  {t.status === "DRAFT" &&
                  (role === "HQ_ADMIN" || userBranchId === t.fromBranch.id) ? (
                    <button type="button" className="btn-sm" onClick={() => ship(t.id)}>
                      Ship
                    </button>
                  ) : null}
                  {t.status === "IN_TRANSIT" &&
                  (role === "HQ_ADMIN" || userBranchId === t.toBranch.id) ? (
                    <button type="button" className="btn-sm" onClick={() => openReceive(t)}>
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

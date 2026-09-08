"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_FLOW } from "@/lib/permissions";

type Order = {
  id: string;
  orderNo: string;
  status: string;
  customerName: string;
  customerPhone: string;
  fulfillment: string;
  totalLabel: string;
  createdLabel: string;
  address?: string | null;
  branch: { name: string };
  lines: { quantity: number; product: { name: string } }[];
};

const COLUMNS = [
  { key: "PENDING", title: "New" },
  { key: "CONFIRMED", title: "Confirmed" },
  { key: "PREPARING", title: "Preparing" },
  { key: "READY", title: "Ready" },
  { key: "COMPLETED", title: "Done" },
] as const;

const NEXT_LABEL: Record<string, string> = {
  CONFIRMED: "Confirm",
  PREPARING: "Start prep",
  READY: "Mark ready",
  COMPLETED: "Complete",
  CANCELLED: "Cancel",
};

function normalizeStatus(s: string) {
  if (s === "ACCEPTED") return "CONFIRMED";
  return s;
}

export function OrdersClient({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const board = useMemo(() => {
    const map: Record<string, Order[]> = {
      PENDING: [],
      CONFIRMED: [],
      PREPARING: [],
      READY: [],
      COMPLETED: [],
    };
    for (const o of orders) {
      const st = normalizeStatus(o.status);
      if (st === "CANCELLED") continue;
      if (map[st]) map[st].push({ ...o, status: st });
      else map.PENDING.push({ ...o, status: st });
    }
    return map;
  }, [orders]);

  async function setStatus(orderId: string, status: string) {
    setBusy(orderId + status);
    setMsg("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateStatus", orderId, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed");
        return;
      }
      setMsg(`Updated → ${status}`);
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {msg ? <p className="success">{msg}</p> : null}
      <div className="kitchen-board">
        {COLUMNS.map((col) => (
          <section key={col.key} className="kitchen-col">
            <header>
              <h2>{col.title}</h2>
              <em>{board[col.key]?.length || 0}</em>
            </header>
            <div className="kitchen-cards">
              {(board[col.key] || []).map((o) => {
                const next = (ORDER_FLOW[o.status] || []).filter((s) => s !== "CANCELLED");
                const primary = next[0];
                return (
                  <article key={o.id} className="kitchen-card">
                    <div className="kitchen-card-top">
                      <strong>{o.orderNo}</strong>
                      <span>{o.fulfillment}</span>
                    </div>
                    <p className="kitchen-branch">{o.branch.name}</p>
                    <p>
                      {o.customerName}
                      <br />
                      <small>{o.customerPhone}</small>
                    </p>
                    <ul>
                      {o.lines.map((l, i) => (
                        <li key={i}>
                          {l.product.name} × {l.quantity}
                        </li>
                      ))}
                    </ul>
                    <p className="kitchen-total">{o.totalLabel}</p>
                    <div className="row-actions">
                      {primary ? (
                        <button
                          type="button"
                          className="btn-sm"
                          disabled={!!busy}
                          onClick={() => setStatus(o.id, primary)}
                        >
                          {NEXT_LABEL[primary] || primary}
                        </button>
                      ) : null}
                      {(ORDER_FLOW[o.status] || []).includes("CANCELLED") ? (
                        <button
                          type="button"
                          className="btn-sm"
                          disabled={!!busy}
                          onClick={() => setStatus(o.id, "CANCELLED")}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              {!board[col.key]?.length ? <p className="muted kitchen-empty">None</p> : null}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Order = {
  id: string;
  orderNo: string;
  status: string;
  customerName: string;
  customerPhone: string;
  fulfillment: string;
  totalLabel: string;
  createdLabel: string;
  branch: { name: string };
  lines: { quantity: number; product: { name: string } }[];
};

export function OrdersClient({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function setStatus(orderId: string, status: string) {
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
    setMsg(`Order updated to ${status}`);
    router.refresh();
  }

  return (
    <>
      {msg ? <p className="success">{msg}</p> : null}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Branch</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  {o.orderNo}
                  <br />
                  <small>{o.fulfillment}</small>
                </td>
                <td>{o.branch.name}</td>
                <td>
                  {o.customerName}
                  <br />
                  <small>{o.customerPhone}</small>
                </td>
                <td>
                  {o.lines.map((l) => `${l.product.name} × ${l.quantity}`).join(", ")}
                </td>
                <td>{o.totalLabel}</td>
                <td>{o.status}</td>
                <td className="row-actions">
                  {o.status === "PENDING" ? (
                    <button type="button" className="btn-sm" onClick={() => setStatus(o.id, "ACCEPTED")}>
                      Accept
                    </button>
                  ) : null}
                  {["ACCEPTED", "PREPARING"].includes(o.status) ? (
                    <button type="button" className="btn-sm" onClick={() => setStatus(o.id, "READY")}>
                      Ready
                    </button>
                  ) : null}
                  {o.status === "READY" ? (
                    <button type="button" className="btn-sm" onClick={() => setStatus(o.id, "COMPLETED")}>
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

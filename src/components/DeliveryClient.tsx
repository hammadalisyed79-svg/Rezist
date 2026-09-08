"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPKR } from "@/lib/utils";

type Rider = { id: string; name: string; phone: string; vehicle: string | null };
type Order = {
  id: string;
  orderNo: string;
  status: string;
  deliveryStatus: string | null;
  customerName: string;
  customerPhone: string;
  address: string | null;
  total: number;
  externalChannel: string;
  branch: { name: string };
  rider?: { name: string } | null;
};

export function DeliveryClient({
  riders,
  orders,
  branches,
  defaultBranchId,
}: {
  riders: Rider[];
  orders: Order[];
  branches: { id: string; name: string }[];
  defaultBranchId: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [branchId, setBranchId] = useState(defaultBranchId);

  async function post(body: Record<string, unknown>) {
    const res = await fetch("/api/delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return null;
    }
    router.refresh();
    return data;
  }

  return (
    <>
      {msg ? <p className="success">{msg}</p> : null}

      <form
        className="panel form-inline"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const data = await post({
            action: "createRider",
            name: fd.get("name"),
            phone: fd.get("phone"),
            vehicle: fd.get("vehicle"),
            branchId: fd.get("branchId") || branchId,
          });
          if (data) setMsg(`Rider ${data.rider.name} added`);
          e.currentTarget.reset();
        }}
      >
        <h2>Add rider</h2>
        <input name="name" placeholder="Name" required />
        <input name="phone" placeholder="Phone" required />
        <input name="vehicle" placeholder="Bike / car" />
        <select name="branchId" defaultValue={branchId} onChange={(e) => setBranchId(e.target.value)}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Save rider
        </button>
      </form>

      <form
        className="panel form-inline"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const lines = String(fd.get("skus") || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((sku) => ({ sku, quantity: 1 }));
          const data = await post({
            action: "importMarketplace",
            channel: fd.get("channel"),
            externalRef: fd.get("externalRef"),
            branchId: fd.get("branchId") || branchId,
            customerName: fd.get("customerName"),
            customerPhone: fd.get("customerPhone"),
            address: fd.get("address"),
            lines,
          });
          if (data?.duplicate) setMsg(`Already imported as ${data.order.orderNo}`);
          else if (data) setMsg(`Imported ${data.order.orderNo}`);
        }}
      >
        <h2>Import Foodpanda / Careem</h2>
        <select name="channel" defaultValue="FOODPANDA">
          <option value="FOODPANDA">Foodpanda</option>
          <option value="CAREEM">Careem</option>
          <option value="MANUAL">Manual</option>
        </select>
        <input name="externalRef" placeholder="Platform order #" required />
        <select name="branchId" defaultValue={branchId}>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <input name="customerName" placeholder="Customer" required />
        <input name="customerPhone" placeholder="Phone" required />
        <input name="address" placeholder="Address" />
        <input name="skus" placeholder="SKUs comma-separated e.g. CAK-CHOC-01,CUP-VAN-01" required />
        <button className="btn" type="submit">
          Import
        </button>
      </form>

      <section className="panel">
        <h2>Riders ({riders.length})</h2>
        <ul className="cart-list">
          {riders.map((r) => (
            <li key={r.id}>
              <strong>{r.name}</strong>
              <small>
                {r.phone}
                {r.vehicle ? ` · ${r.vehicle}` : ""}
              </small>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>Delivery board</h2>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Branch</th>
              <th>Customer</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Rider</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  {o.orderNo}
                  <br />
                  <small>{formatPKR(o.total)}</small>
                </td>
                <td>{o.branch.name}</td>
                <td>
                  {o.customerName}
                  <br />
                  <small>{o.customerPhone}</small>
                  {o.address ? (
                    <>
                      <br />
                      <small>{o.address}</small>
                    </>
                  ) : null}
                </td>
                <td>{o.externalChannel}</td>
                <td>
                  {o.status}
                  {o.deliveryStatus ? ` / ${o.deliveryStatus}` : ""}
                </td>
                <td>{o.rider?.name || "—"}</td>
                <td className="row-actions">
                  <select
                    defaultValue=""
                    onChange={async (e) => {
                      if (!e.target.value) return;
                      await post({ action: "assign", orderId: o.id, riderId: e.target.value });
                      setMsg("Assigned");
                    }}
                  >
                    <option value="">Assign…</option>
                    {riders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-sm" onClick={() => post({ action: "dispatch", orderId: o.id })}>
                    Dispatch
                  </button>
                  <button type="button" className="btn-sm" onClick={() => post({ action: "delivered", orderId: o.id })}>
                    Delivered
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!orders.length ? <p className="muted">No delivery orders yet — import marketplace or take web delivery orders.</p> : null}
      </section>
    </>
  );
}

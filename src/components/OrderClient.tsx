"use client";

import { useMemo, useState } from "react";
import { formatPKR } from "@/lib/utils";

type Branch = { id: string; name: string; city: string };
type Product = {
  id: string;
  name: string;
  listPrice: number;
  description: string | null;
  category?: { name: string } | null;
};

export function OrderClient({
  branches,
  products,
  initialBranchId,
}: {
  branches: Branch[];
  products: Product[];
  initialBranchId?: string;
}) {
  const [branchId, setBranchId] = useState(initialBranchId || "");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [fulfillment, setFulfillment] = useState("PICKUP");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState("");
  const [orderNo, setOrderNo] = useState("");

  const lines = useMemo(
    () =>
      products
        .filter((p) => cart[p.id])
        .map((p) => ({
          product: p,
          qty: cart[p.id],
          total: cart[p.id] * p.listPrice,
        })),
    [products, cart]
  );
  const total = lines.reduce((a, l) => a + l.total, 0);

  function add(id: string) {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        customerName: name,
        customerPhone: phone,
        fulfillment,
        address: fulfillment === "DELIVERY" ? address : null,
        items: Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Order failed");
      return;
    }
    setOrderNo(data.order.orderNo);
    setCart({});
    setMsg(`Order placed: ${data.order.orderNo}. The branch will confirm shortly.`);
  }

  return (
    <div className="order-layout">
      <section>
        <label className="field">
          Branch
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.city} — {b.name}
              </option>
            ))}
          </select>
        </label>
        <div className="menu-row">
          {products.map((p) => (
            <button key={p.id} type="button" className="menu-item clickable" onClick={() => add(p.id)}>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <strong>{formatPKR(p.listPrice)}</strong>
              <small>Add to order</small>
            </button>
          ))}
        </div>
      </section>
      <form className="order-cart" onSubmit={placeOrder}>
        <h2>Your order</h2>
        {lines.length === 0 ? <p className="muted">Select items from the menu</p> : null}
        <ul>
          {lines.map((l) => (
            <li key={l.product.id}>
              <span>
                {l.product.name} × {l.qty}
              </span>
              <span>{formatPKR(l.total)}</span>
            </li>
          ))}
        </ul>
        <p className="total">{formatPKR(total)}</p>
        <label>
          Fulfillment
          <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value)}>
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
          </select>
        </label>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </label>
        {fulfillment === "DELIVERY" ? (
          <label>
            Address
            <input value={address} onChange={(e) => setAddress(e.target.value)} required />
          </label>
        ) : null}
        <button className="btn" type="submit" disabled={!lines.length || !branchId}>
          Place order
        </button>
        {msg ? <p className={orderNo ? "success" : "error"}>{msg}</p> : null}
      </form>
    </div>
  );
}

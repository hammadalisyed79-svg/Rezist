"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPKR } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { useCart } from "@/components/CartProvider";
import { AddToCartButton } from "@/components/AddToCartButton";
import Image from "next/image";

type Branch = { id: string; name: string; city: string };
type Product = {
  id: string;
  name: string;
  listPrice: number;
  description: string | null;
  imageUrl: string | null;
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
  const { cart, setQty, clear, branchId, setBranchId, fulfillment, setFulfillment } = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState("");
  const [orderNo, setOrderNo] = useState("");

  useEffect(() => {
    if (!branchId && initialBranchId) setBranchId(initialBranchId);
  }, [branchId, initialBranchId, setBranchId]);

  const cities = useMemo(() => [...new Set(branches.map((b) => b.city))], [branches]);
  const selectedBranch = branches.find((b) => b.id === branchId) || branches[0];
  const city = selectedBranch?.city || cities[0] || "";
  const cityBranches = branches.filter((b) => b.city === city);

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
  const deliveryNote =
    fulfillment === "DELIVERY" && total < brand.freeDeliveryMin
      ? `Add ${formatPKR(brand.freeDeliveryMin - total)} more for free delivery`
      : fulfillment === "DELIVERY"
        ? "Free delivery unlocked"
        : null;

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId: branchId || selectedBranch?.id,
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
    clear();
    setMsg(`Order placed: ${data.order.orderNo}. The branch will confirm shortly.`);
  }

  return (
    <div className="order-layout layers-order">
      <section>
        <div className="order-filters panel">
          <div className="fulfill-toggle">
            <button
              type="button"
              className={fulfillment === "PICKUP" ? "active" : undefined}
              onClick={() => setFulfillment("PICKUP")}
            >
              Pickup
            </button>
            <button
              type="button"
              className={fulfillment === "DELIVERY" ? "active" : undefined}
              onClick={() => setFulfillment("DELIVERY")}
            >
              Delivery
            </button>
          </div>
          <label>
            City / region
            <select
              value={city}
              onChange={(e) => {
                const first = branches.find((b) => b.city === e.target.value);
                if (first) setBranchId(first.id);
              }}
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Branch
            <select value={branchId || selectedBranch?.id} onChange={(e) => setBranchId(e.target.value)}>
              {cityBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="product-shop-grid">
          {products.map((p) => (
            <article key={p.id} className="product-card">
              <div className="product-card-media">
                <Image src={p.imageUrl || brand.heroImage} alt={p.name} fill sizes="200px" />
              </div>
              <div className="product-card-body">
                <small>{p.category?.name}</small>
                <h3>{p.name}</h3>
                <div className="product-card-row">
                  <strong>{formatPKR(p.listPrice)}</strong>
                  <AddToCartButton productId={p.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <form className="order-cart" onSubmit={placeOrder}>
        <h2>Your cart</h2>
        {lines.length === 0 ? <p className="muted">Add desserts from the menu</p> : null}
        <ul>
          {lines.map((l) => (
            <li key={l.product.id}>
              <span>
                {l.product.name}
                <div className="qty">
                  <button type="button" onClick={() => setQty(l.product.id, l.qty - 1)}>
                    −
                  </button>
                  <span>{l.qty}</span>
                  <button type="button" onClick={() => setQty(l.product.id, l.qty + 1)}>
                    +
                  </button>
                </div>
              </span>
              <span>{formatPKR(l.total)}</span>
            </li>
          ))}
        </ul>
        <p className="total">{formatPKR(total)}</p>
        {deliveryNote ? <p className="muted">{deliveryNote}</p> : null}
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
            Delivery address
            <input value={address} onChange={(e) => setAddress(e.target.value)} required />
          </label>
        ) : null}
        <button className="btn" type="submit" disabled={!lines.length || !(branchId || selectedBranch)}>
          Place order
        </button>
        {msg ? <p className={orderNo ? "success" : "error"}>{msg}</p> : null}
      </form>
    </div>
  );
}

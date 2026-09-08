"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatPKR } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { useCart } from "@/components/CartProvider";
import { ProductCard } from "@/components/ProductCard";

type Branch = { id: string; name: string; city: string };
type Product = {
  id: string;
  name: string;
  listPrice: number;
  description: string | null;
  imageUrl: string | null;
  allergens?: string | null;
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
  const { cart, setQty, clear, branchId, setBranchId, fulfillment, setFulfillment, rememberPrice } =
    useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    if (!branchId && initialBranchId) setBranchId(initialBranchId);
  }, [branchId, initialBranchId, setBranchId]);

  useEffect(() => {
    for (const p of products) {
      if (cart[p.id]) rememberPrice(p.id, p.listPrice);
    }
  }, [products, cart, rememberPrice]);

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
  const itemCount = lines.reduce((a, l) => a + l.qty, 0);
  const deliveryNote =
    fulfillment === "DELIVERY" && total < brand.freeDeliveryMin
      ? `Add ${formatPKR(brand.freeDeliveryMin - total)} more for free delivery`
      : fulfillment === "DELIVERY"
        ? "Free delivery unlocked"
        : null;

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setSubmitting(true);
    try {
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
      setShowCart(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (orderNo) {
    return (
      <div className="lz-success">
        <p className="eyebrow">Confirmed</p>
        <h2>Thank you — order {orderNo}</h2>
        <p>
          We received your {fulfillment === "DELIVERY" ? "delivery" : "pickup"} request
          {selectedBranch ? ` at ${selectedBranch.name}` : ""}. Keep your phone nearby.
        </p>
        <div className="hero-cta">
          <Link className="btn" href="/menu">
            Order more
          </Link>
          <a className="btn-ghost" href={brand.phoneHref}>
            Call branch
          </a>
        </div>
      </div>
    );
  }

  const cartForm = (
    <form className="order-cart lz-cart-sticky" onSubmit={placeOrder}>
      <div className="lz-cart-top">
        <h2>Cart</h2>
        <button type="button" className="lz-cart-close" onClick={() => setShowCart(false)}>
          Close
        </button>
      </div>
      {lines.length === 0 ? <p className="muted">Your cart is empty — add desserts from the menu.</p> : null}
      <ul>
        {lines.map((l) => (
          <li key={l.product.id}>
            <span>
              {l.product.name}
              <div className="qty">
                <button type="button" onClick={() => setQty(l.product.id, l.qty - 1, l.product.listPrice)}>
                  −
                </button>
                <span>{l.qty}</span>
                <button type="button" onClick={() => setQty(l.product.id, l.qty + 1, l.product.listPrice)}>
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
        <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
      </label>
      <label>
        Phone
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
          inputMode="tel"
        />
      </label>
      {fulfillment === "DELIVERY" ? (
        <label>
          Delivery address
          <input value={address} onChange={(e) => setAddress(e.target.value)} required autoComplete="street-address" />
        </label>
      ) : null}
      <button className="btn" type="submit" disabled={!lines.length || !(branchId || selectedBranch) || submitting}>
        {submitting ? "Placing…" : "Place order"}
      </button>
      {msg ? <p className="error">{msg}</p> : null}
    </form>
  );

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
            City
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

        <div className="lz-product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <div className="lz-cart-desktop">{cartForm}</div>

      {showCart ? <div className="lz-cart-sheet">{cartForm}</div> : null}

      {itemCount > 0 ? (
        <button type="button" className="lz-order-fab" onClick={() => setShowCart(true)}>
          <span>
            {itemCount} item{itemCount === 1 ? "" : "s"} · {formatPKR(total)}
          </span>
          <strong>Checkout</strong>
        </button>
      ) : null}
    </div>
  );
}

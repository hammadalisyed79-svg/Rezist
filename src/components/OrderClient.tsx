"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatPKR } from "@/lib/utils";
import { brand } from "@/lib/brand";
import { useCart } from "@/components/CartProvider";
import { ProductCard } from "@/components/ProductCard";
import { CustomerInvoice } from "@/components/CustomerInvoice";
import { orderToInvoice, type InvoiceDoc } from "@/lib/invoice";

type Branch = { id: string; name: string; city: string; address?: string; phone?: string | null };
type Product = {
  id: string;
  sku?: string;
  name: string;
  listPrice: number;
  description: string | null;
  imageUrl: string | null;
  allergens?: string | null;
  category?: { name: string } | null;
};

const LAST_ORDER_KEY = "rezist_last_order_invoice";

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
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [invoice, setInvoice] = useState<InvoiceDoc | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [step, setStep] = useState<"cart" | "details">("cart");

  useEffect(() => {
    if (!branchId && initialBranchId) setBranchId(initialBranchId);
  }, [branchId, initialBranchId, setBranchId]);

  useEffect(() => {
    for (const p of products) {
      if (cart[p.id]) rememberPrice(p.id, p.listPrice);
    }
  }, [products, cart, rememberPrice]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(LAST_ORDER_KEY);
      if (raw) setInvoice(JSON.parse(raw) as InvoiceDoc);
    } catch {
      /* ignore */
    }
  }, []);

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
    if (!name.trim() || !phone.trim()) {
      setMsg("Name and phone are required");
      setStep("details");
      return;
    }
    if (fulfillment === "DELIVERY" && !address.trim()) {
      setMsg("Delivery address is required");
      setStep("details");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: branchId || selectedBranch?.id,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || null,
          fulfillment,
          address: fulfillment === "DELIVERY" ? address.trim() : null,
          notes: notes.trim() || null,
          items: Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Order failed");
        return;
      }
      const doc = orderToInvoice(data.order);
      setInvoice(doc);
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(doc));
      } catch {
        /* ignore */
      }
      clear();
      setShowCart(false);
      setStep("cart");
    } finally {
      setSubmitting(false);
    }
  }

  if (invoice) {
    const waText = encodeURIComponent(
      `Hi Rezist, I placed order ${invoice.docNo}${invoice.branchName ? ` for ${invoice.branchName}` : ""}. Total ${formatPKR(invoice.total)}.`
    );
    const waHref = `https://wa.me/923314213137?text=${waText}`;
    return (
      <div className="lz-checkout-done">
        <div className="lz-success" role="status">
          <p className="eyebrow">Order confirmed</p>
          <h2>Thank you — {invoice.docNo}</h2>
          <p>
            Your {invoice.fulfillment === "DELIVERY" ? "delivery" : "pickup"} request at{" "}
            {invoice.branchName} is with the kitchen. Your customer slip is below — print or save it.
          </p>
        </div>
        <CustomerInvoice
          doc={invoice}
          actions={
            <>
              <a className="btn-ghost" href={waHref} target="_blank" rel="noreferrer">
                WhatsApp branch
              </a>
              <Link
                className="text-link"
                href="/menu"
                onClick={() => {
                  setInvoice(null);
                  try {
                    sessionStorage.removeItem(LAST_ORDER_KEY);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Order more
              </Link>
            </>
          }
        />
      </div>
    );
  }

  const emptyCart = (
    <div className="lz-empty lz-cart-empty">
      <h3>Your cart is empty</h3>
      <p>Browse cakes, brownies and more — add what you crave, then checkout here.</p>
      <Link className="btn" href="/menu">
        Browse menu
      </Link>
    </div>
  );

  const cartForm = (
    <form className="order-cart lz-cart-sticky" onSubmit={placeOrder}>
      <div className="lz-cart-top">
        <h2>Checkout</h2>
        <button type="button" className="lz-cart-close" onClick={() => setShowCart(false)}>
          Close
        </button>
      </div>
      {lines.length === 0 ? (
        emptyCart
      ) : (
        <>
          <div className="lz-checkout-steps" role="tablist" aria-label="Checkout steps">
            <button
              type="button"
              role="tab"
              aria-selected={step === "cart"}
              className={step === "cart" ? "active" : undefined}
              onClick={() => setStep("cart")}
            >
              1. Items
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={step === "details"}
              className={step === "details" ? "active" : undefined}
              onClick={() => setStep("details")}
            >
              2. Details
            </button>
          </div>

          {step === "cart" ? (
            <>
              <ul>
                {lines.map((l) => (
                  <li key={l.product.id}>
                    <span>
                      {l.product.name}
                      <div className="qty">
                        <button
                          type="button"
                          aria-label={`Decrease ${l.product.name}`}
                          onClick={() => setQty(l.product.id, l.qty - 1, l.product.listPrice)}
                        >
                          −
                        </button>
                        <span>{l.qty}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${l.product.name}`}
                          onClick={() => setQty(l.product.id, l.qty + 1, l.product.listPrice)}
                        >
                          +
                        </button>
                      </div>
                    </span>
                    <span>{formatPKR(l.total)}</span>
                  </li>
                ))}
              </ul>
              <div className="lz-checkout-summary">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatPKR(total)}</strong>
                </div>
                <div>
                  <span>Tax / GST</span>
                  <strong>{formatPKR(0)}</strong>
                </div>
                <div className="lz-checkout-grand">
                  <span>Total</span>
                  <strong>{formatPKR(total)}</strong>
                </div>
              </div>
              {deliveryNote ? <p className="muted">{deliveryNote}</p> : null}
              <button type="button" className="btn" onClick={() => setStep("details")}>
                Continue to details
              </button>
            </>
          ) : (
            <>
              <p className="muted lz-checkout-mini">
                {itemCount} item{itemCount === 1 ? "" : "s"} · {formatPKR(total)} ·{" "}
                {fulfillment === "DELIVERY" ? "Delivery" : "Pickup"} · {selectedBranch?.name}
              </p>
              <label>
                Full name
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
                  placeholder="03xx…"
                />
              </label>
              <label>
                Email <span className="muted">(optional · for slip)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </label>
              {fulfillment === "DELIVERY" ? (
                <label>
                  Delivery address
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    rows={2}
                    autoComplete="street-address"
                  />
                </label>
              ) : null}
              <label>
                Order notes <span className="muted">(optional)</span>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Candles, message on cake…"
                />
              </label>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                You will receive a professional order slip after placing. Payment: pay at counter /
                COD on delivery.
              </p>
              <div className="hero-cta" style={{ marginTop: "0.5rem" }}>
                <button type="button" className="btn-ghost" onClick={() => setStep("cart")}>
                  Back
                </button>
                <button
                  className="btn"
                  type="submit"
                  disabled={!lines.length || !(branchId || selectedBranch) || submitting}
                >
                  {submitting ? "Placing…" : `Place order · ${formatPKR(total)}`}
                </button>
              </div>
              {msg ? <p className="error">{msg}</p> : null}
            </>
          )}
        </>
      )}
    </form>
  );

  return (
    <div className="order-layout layers-order">
      <section>
        <div className="order-filters panel">
          <div className="fulfill-toggle" role="group" aria-label="Fulfillment">
            <button
              type="button"
              className={fulfillment === "PICKUP" ? "active" : undefined}
              aria-pressed={fulfillment === "PICKUP"}
              onClick={() => setFulfillment("PICKUP")}
            >
              Pickup
            </button>
            <button
              type="button"
              className={fulfillment === "DELIVERY" ? "active" : undefined}
              aria-pressed={fulfillment === "DELIVERY"}
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

        {itemCount === 0 ? (
          <div className="lz-empty" style={{ marginBottom: "1.25rem" }}>
            <h3>Start with the menu</h3>
            <p>Add desserts below or open the full menu to explore by category.</p>
            <Link className="btn-sm" href="/menu">
              Open full menu →
            </Link>
          </div>
        ) : null}

        <div className="lz-product-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <div className="lz-cart-desktop">{cartForm}</div>

      {showCart ? (
        <div className="lz-cart-sheet" role="dialog" aria-modal="true" aria-label="Cart checkout">
          {cartForm}
        </div>
      ) : null}

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

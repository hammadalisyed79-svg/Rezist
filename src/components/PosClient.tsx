"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPKR } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  listPrice: number;
  sku: string;
  category?: { name: string } | null;
};
type Branch = { id: string; name: string; type: string };

export function PosClient({
  initialBranchId,
  role,
}: {
  initialBranchId: string | null;
  role: string;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState(initialBranchId || "");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [message, setMessage] = useState("");
  const [lastSale, setLastSale] = useState("");

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => {
        const retail = (d.branches || []).filter((b: Branch) => b.type === "RETAIL");
        setBranches(retail);
        if (!branchId && retail[0]) setBranchId(retail[0].id);
      });
    fetch("/api/products?sellable=1")
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []));
  }, []);

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
  function dec(id: string) {
    setCart((c) => {
      const next = { ...c };
      if (!next[id]) return next;
      next[id] -= 1;
      if (next[id] <= 0) delete next[id];
      return next;
    });
  }

  async function checkout() {
    setMessage("");
    const res = await fetch("/api/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        paymentMethod,
        items: Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Sale failed");
      return;
    }
    setLastSale(data.sale.saleNo);
    setCart({});
    setMessage(`Sale ${data.sale.saleNo} recorded — ${formatPKR(data.sale.total)}`);
  }

  return (
    <div className="pos-grid">
      <section className="panel">
        <div className="toolbar">
          {role === "HQ_ADMIN" ? (
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : (
            <strong>{branches.find((b) => b.id === branchId)?.name || "Branch POS"}</strong>
          )}
        </div>
        <div className="product-grid">
          {products.map((p) => (
            <button key={p.id} type="button" className="product-tile" onClick={() => add(p.id)}>
              <span>{p.name}</span>
              <small>{formatPKR(p.listPrice)}</small>
            </button>
          ))}
        </div>
      </section>
      <aside className="panel cart-panel">
        <h2>Cart</h2>
        {lines.length === 0 ? <p className="muted">Tap products to add</p> : null}
        <ul className="cart-list">
          {lines.map((l) => (
            <li key={l.product.id}>
              <div>
                <strong>{l.product.name}</strong>
                <small>{formatPKR(l.total)}</small>
              </div>
              <div className="qty">
                <button type="button" onClick={() => dec(l.product.id)}>
                  −
                </button>
                <span>{l.qty}</span>
                <button type="button" onClick={() => add(l.product.id)}>
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="cart-footer">
          <label>
            Payment
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="JAZZCASH">JazzCash</option>
              <option value="EASYPAISA">EasyPaisa</option>
            </select>
          </label>
          <p className="total">{formatPKR(total)}</p>
          <button type="button" className="btn" disabled={!lines.length || !branchId} onClick={checkout}>
            Complete sale
          </button>
          {message ? <p className="success">{message}</p> : null}
          {lastSale ? <p className="muted">Last: {lastSale}</p> : null}
        </div>
      </aside>
    </div>
  );
}

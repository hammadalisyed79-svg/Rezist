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
type Shift = {
  id: string;
  tillNo: string;
  status: string;
  openingCash: number;
  branch: { name: string };
};

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
  const [shift, setShift] = useState<Shift | null>(null);
  const [tillNo, setTillNo] = useState("TILL-1");
  const [openingCash, setOpeningCash] = useState(2000);
  const [recentSales, setRecentSales] = useState<{ id: string; saleNo: string; total: number }[]>([]);
  const [voidPin, setVoidPin] = useState("");
  const [voidSaleId, setVoidSaleId] = useState("");

  async function loadShift(bid: string) {
    const res = await fetch(`/api/shifts?branchId=${bid}`);
    const data = await res.json();
    setShift(data.shifts?.[0] || null);
  }

  async function loadSales(bid: string) {
    const res = await fetch(`/api/pos?branchId=${bid}`);
    const data = await res.json();
    setRecentSales(
      (data.sales || []).slice(0, 8).map((s: { id: string; saleNo: string; total: number }) => ({
        id: s.id,
        saleNo: s.saleNo,
        total: s.total,
      }))
    );
  }

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

  useEffect(() => {
    if (!branchId) return;
    loadShift(branchId);
    loadSales(branchId);
  }, [branchId]);

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

  async function openShift() {
    setMessage("");
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open", branchId, tillNo, openingCash }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Cannot open shift");
      return;
    }
    setShift(data.shift);
    setMessage(`Shift open · ${data.shift.tillNo}`);
  }

  async function closeShift() {
    if (!shift) return;
    const closingCash = Number(prompt("Closing cash count (PKR)", String(openingCash)) || 0);
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close", shiftId: shift.id, closingCash }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Close failed");
      return;
    }
    setShift(null);
    setMessage("Shift closed");
  }

  async function checkout() {
    setMessage("");
    if (!shift) {
      setMessage("Open a till shift first");
      return;
    }
    const res = await fetch("/api/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        shiftId: shift.id,
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
    loadSales(branchId);
  }

  async function voidSale() {
    if (!voidSaleId || !voidPin) {
      setMessage("Select a sale and enter manager PIN");
      return;
    }
    const res = await fetch("/api/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "void",
        saleId: voidSaleId,
        managerPin: voidPin,
        reason: "POS void",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Void failed");
      return;
    }
    setMessage("Sale voided (stock restored)");
    setVoidPin("");
    setVoidSaleId("");
    loadSales(branchId);
  }

  return (
    <div className="pos-grid">
      <section className="panel">
        <div className="toolbar pos-shift-bar">
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
          {!shift ? (
            <>
              <select value={tillNo} onChange={(e) => setTillNo(e.target.value)}>
                <option value="TILL-1">TILL-1</option>
                <option value="TILL-2">TILL-2</option>
                <option value="TILL-3">TILL-3</option>
              </select>
              <input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(Number(e.target.value))}
                style={{ width: 110 }}
                title="Opening cash"
              />
              <button type="button" className="btn-sm" onClick={openShift}>
                Open shift
              </button>
            </>
          ) : (
            <>
              <span className="badge status-ready">
                {shift.tillNo} · OPEN
              </span>
              <button type="button" className="btn-sm" onClick={closeShift}>
                Close shift
              </button>
            </>
          )}
        </div>
        {!shift ? (
          <p className="muted">Open a till shift to start selling (multi-till ready).</p>
        ) : null}
        <div className="product-grid">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              className="product-tile"
              onClick={() => add(p.id)}
              disabled={!shift}
            >
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
          <button type="button" className="btn" disabled={!lines.length || !branchId || !shift} onClick={checkout}>
            Complete sale
          </button>
          {message ? <p className={message.toLowerCase().includes("fail") || message.toLowerCase().includes("invalid") || message.toLowerCase().includes("open") ? "error" : "success"}>{message}</p> : null}
          {lastSale ? <p className="muted">Last: {lastSale}</p> : null}
        </div>

        <div className="pos-void">
          <h3>Void (manager PIN)</h3>
          <select value={voidSaleId} onChange={(e) => setVoidSaleId(e.target.value)}>
            <option value="">Recent sale…</option>
            {recentSales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.saleNo} · {formatPKR(s.total)}
              </option>
            ))}
          </select>
          <input
            type="password"
            placeholder="Manager PIN"
            value={voidPin}
            onChange={(e) => setVoidPin(e.target.value)}
          />
          <button type="button" className="btn-sm" onClick={voidSale}>
            Void sale
          </button>
        </div>
      </aside>
    </div>
  );
}

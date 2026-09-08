"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InventoryAdjustForm({
  branchId,
  products,
}: {
  branchId: string;
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId,
        productId: fd.get("productId"),
        quantity: Number(fd.get("quantity")),
        reorderLevel: Number(fd.get("reorderLevel") || 0),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg("Stock updated");
    router.refresh();
  }

  return (
    <form className="panel form-inline" onSubmit={onSubmit}>
      <h2>Set stock level</h2>
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
        Quantity
        <input name="quantity" type="number" step="0.01" required />
      </label>
      <label>
        Reorder level
        <input name="reorderLevel" type="number" step="0.01" defaultValue={10} />
      </label>
      <button className="btn" type="submit">
        Save
      </button>
      {msg ? <p className="success">{msg}</p> : null}
    </form>
  );
}

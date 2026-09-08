"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProductCreateForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: fd.get("sku"),
        name: fd.get("name"),
        type: fd.get("type"),
        categoryId: fd.get("categoryId") || null,
        listPrice: Number(fd.get("listPrice") || 0),
        costPrice: Number(fd.get("costPrice") || 0),
        isSellable: fd.get("isSellable") === "on",
        isPublic: fd.get("isPublic") === "on",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        Add product
      </button>
    );
  }

  return (
    <form className="panel form-grid" onSubmit={onSubmit}>
      <h2>New product</h2>
      {error ? <p className="error">{error}</p> : null}
      <label>
        SKU
        <input name="sku" required />
      </label>
      <label>
        Name
        <input name="name" required />
      </label>
      <label>
        Type
        <select name="type" defaultValue="FINISHED">
          <option value="FINISHED">Finished</option>
          <option value="RAW">Raw</option>
          <option value="SEMI">Semi</option>
        </select>
      </label>
      <label>
        Category
        <select name="categoryId" defaultValue="">
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        List price (PKR)
        <input name="listPrice" type="number" min="0" step="1" defaultValue={0} />
      </label>
      <label>
        Cost price (PKR)
        <input name="costPrice" type="number" min="0" step="1" defaultValue={0} />
      </label>
      <label className="check">
        <input name="isSellable" type="checkbox" defaultChecked /> Sellable
      </label>
      <label className="check">
        <input name="isPublic" type="checkbox" defaultChecked /> Show on website
      </label>
      <div className="row-actions">
        <button type="submit" className="btn">
          Save
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

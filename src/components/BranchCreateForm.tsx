"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BranchCreateForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: fd.get("code"),
        name: fd.get("name"),
        city: fd.get("city"),
        address: fd.get("address"),
        phone: fd.get("phone"),
        type: fd.get("type"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form className="panel form-inline" onSubmit={onSubmit}>
      <h2>Add branch</h2>
      {error ? <p className="error">{error}</p> : null}
      <label>
        Code
        <input name="code" placeholder="KHI-01" required />
      </label>
      <label>
        Name
        <input name="name" placeholder="Rezist Clifton" required />
      </label>
      <label>
        City
        <input name="city" placeholder="Karachi" required />
      </label>
      <label>
        Address
        <input name="address" required />
      </label>
      <label>
        Phone
        <input name="phone" />
      </label>
      <label>
        Type
        <select name="type" defaultValue="RETAIL">
          <option value="RETAIL">Retail</option>
          <option value="WAREHOUSE">Warehouse</option>
          <option value="CENTRAL_KITCHEN">Central kitchen</option>
        </select>
      </label>
      <button className="btn" type="submit">
        Create
      </button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Promo = {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  city: string | null;
  active: boolean;
  startsAt: string | Date;
  endsAt: string | Date;
  branch?: { name: string } | null;
  items: { product: { name: string } }[];
};

export function PromoClient({
  promotions,
  overrides,
  branches,
  products,
  cities,
}: {
  promotions: Promo[];
  overrides: {
    id: string;
    price: number;
    branchId: string;
    productId: string;
    branch: { name: string };
    product: { name: string };
  }[];
  branches: { id: string; name: string; city: string }[];
  products: { id: string; name: string }[];
  cities: string[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        code: fd.get("code"),
        type: fd.get("type"),
        value: Number(fd.get("value")),
        city: fd.get("city") || null,
        branchId: fd.get("branchId") || null,
        productId: fd.get("productId") || null,
        startsAt: fd.get("startsAt"),
        endsAt: fd.get("endsAt"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Created ${data.promotion.code}`);
    router.refresh();
  }

  async function toggle(id: string, active: boolean) {
    await fetch("/api/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id, active }),
    });
    router.refresh();
  }

  return (
    <>
      <form className="panel form-inline" onSubmit={create}>
        <h2>New promotion</h2>
        <label>
          Name
          <input name="name" required placeholder="Weekend 10% off cakes" />
        </label>
        <label>
          Code
          <input name="code" placeholder="WKND10" />
        </label>
        <label>
          Type
          <select name="type" defaultValue="PERCENT">
            <option value="PERCENT">Percent off</option>
            <option value="FIXED">Fixed PKR off</option>
            <option value="BRANCH_PRICE">Force price</option>
          </select>
        </label>
        <label>
          Value
          <input name="value" type="number" step="0.01" defaultValue={10} required />
        </label>
        <label>
          City (optional)
          <select name="city" defaultValue="">
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Branch (optional)
          <select name="branchId" defaultValue="">
            <option value="">Any</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Product (optional = all)
          <select name="productId" defaultValue="">
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Starts
          <input name="startsAt" type="datetime-local" />
        </label>
        <label>
          Ends
          <input name="endsAt" type="datetime-local" />
        </label>
        <button className="btn" type="submit">
          Create
        </button>
      </form>
      {msg ? <p className="success">{msg}</p> : null}

      <form
        className="panel form-inline"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/promotions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "setPriceOverride",
              branchId: fd.get("branchId"),
              productId: fd.get("productId"),
              price: Number(fd.get("price")),
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            setMsg(data.error || "Override failed");
            return;
          }
          setMsg(`Branch price set for ${data.override.product.name}`);
          router.refresh();
        }}
      >
        <h2>Branch price override</h2>
        <label>
          Branch
          <select name="branchId" required>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
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
          Price (PKR)
          <input name="price" type="number" step="1" required />
        </label>
        <button className="btn" type="submit">
          Save override
        </button>
      </form>

      {overrides.length ? (
        <section className="panel">
          <h2>Active overrides</h2>
          <table>
            <thead>
              <tr>
                <th>Branch</th>
                <th>Product</th>
                <th>Price</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id}>
                  <td>{o.branch.name}</td>
                  <td>{o.product.name}</td>
                  <td>{o.price}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={async () => {
                        await fetch("/api/promotions", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "clearPriceOverride",
                            branchId: o.branchId,
                            productId: o.productId,
                          }),
                        });
                        router.refresh();
                      }}
                    >
                      Clear
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Deal</th>
              <th>Scope</th>
              <th>Window</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <tr key={p.id}>
                <td>{p.code}</td>
                <td>
                  {p.name}
                  {p.items.length ? (
                    <>
                      <br />
                      <small>{p.items.map((i) => i.product.name).join(", ")}</small>
                    </>
                  ) : null}
                </td>
                <td>
                  {p.type} {p.value}
                </td>
                <td>{p.branch?.name || p.city || "Network-wide"}</td>
                <td>
                  <small>
                    {new Date(p.startsAt).toLocaleDateString()} → {new Date(p.endsAt).toLocaleDateString()}
                  </small>
                </td>
                <td>
                  <button type="button" className="btn-sm" onClick={() => toggle(p.id, !p.active)}>
                    {p.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

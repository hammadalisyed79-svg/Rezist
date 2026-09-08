"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  birthday: string | Date | null;
  loyaltyPoints: number;
  preferredBranch?: { name: string } | null;
  _count: { sales: number; orders: number };
};

export function CustomersClient({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        phone: fd.get("phone"),
        email: fd.get("email"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Saved ${data.customer.name}`);
    router.refresh();
  }

  async function addPoints(id: string) {
    const delta = Number(prompt("Points to add (+/-)", "10") || 0);
    if (!delta) return;
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "adjustPoints", customerId: id, delta, reason: "Manual" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    router.refresh();
  }

  const filtered = customers.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      c.phone.includes(q)
  );

  return (
    <>
      <form className="panel form-inline" onSubmit={create}>
        <h2>Add / upsert customer</h2>
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Phone
          <input name="phone" required placeholder="03xx..." />
        </label>
        <label>
          Email
          <input name="email" type="email" />
        </label>
        <button className="btn" type="submit">
          Save
        </button>
      </form>
      {msg ? <p className="success">{msg}</p> : null}
      <div className="toolbar">
        <input
          placeholder="Search name or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 220 }}
        />
      </div>
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Points</th>
              <th>Orders</th>
              <th>Branch</th>
              <th>Birthday</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.loyaltyPoints}</td>
                <td>
                  {c._count.sales} POS / {c._count.orders} web
                </td>
                <td>{c.preferredBranch?.name || "—"}</td>
                <td>
                  {c.birthday ? (
                    <span className="badge status-ready">{new Date(c.birthday).toLocaleDateString()}</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <button type="button" className="btn-sm" onClick={() => addPoints(c.id)}>
                    Adjust pts
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

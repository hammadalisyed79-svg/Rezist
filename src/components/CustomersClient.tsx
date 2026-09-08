"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getLoyaltyTier, isBirthdaySoon, LOYALTY_TIERS } from "@/lib/loyalty";

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
        birthday: fd.get("birthday") || null,
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

  async function setBirthday(id: string) {
    const val = prompt("Birthday (YYYY-MM-DD)", "1995-09-15");
    if (!val) return;
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setBirthday", customerId: id, birthday: val }),
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
  const birthdays = customers.filter((c) => isBirthdaySoon(c.birthday, 14));

  return (
    <>
      {birthdays.length > 0 ? (
        <section className="panel">
          <h2>Birthday cake reminders (14 days)</h2>
          <ul className="bi-rank">
            {birthdays.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>{c.name}</strong>
                  <small>
                    {c.phone} ·{" "}
                    {c.birthday ? new Date(c.birthday).toLocaleDateString() : ""} · WhatsApp cake offer
                  </small>
                </div>
                <a
                  className="btn-sm"
                  href={`https://wa.me/92${c.phone.replace(/\D/g, "").replace(/^0/, "")}?text=${encodeURIComponent(
                    `Salam ${c.name}! Rezist wishes you a sweet birthday — book your cake at your branch.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <h2>Loyalty tiers</h2>
        <p className="muted">
          {LOYALTY_TIERS.map((t) => `${t.label} ≥${t.minPoints}pts (+${Math.round(t.earnBonus * 100)}% earn)`).join(
            " · "
          )}{" "}
          · Redeem 1 pt = Rs 1 (max 20% of sale)
        </p>
      </section>

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
        <label>
          Birthday
          <input name="birthday" type="date" />
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
              <th>Tier</th>
              <th>Points</th>
              <th>Orders</th>
              <th>Branch</th>
              <th>Birthday</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const tier = getLoyaltyTier(c.loyaltyPoints);
              return (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>
                    <span className="badge status-ready">{tier.label}</span>
                  </td>
                  <td>{c.loyaltyPoints}</td>
                  <td>
                    {c._count.sales} POS / {c._count.orders} web
                  </td>
                  <td>{c.preferredBranch?.name || "—"}</td>
                  <td>
                    {c.birthday ? (
                      <span className={isBirthdaySoon(c.birthday) ? "badge status-ready" : undefined}>
                        {new Date(c.birthday).toLocaleDateString()}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="row-actions">
                    <button type="button" className="btn-sm" onClick={() => addPoints(c.id)}>
                      Adjust pts
                    </button>
                    <button type="button" className="btn-sm" onClick={() => setBirthday(c.id)}>
                      Birthday
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

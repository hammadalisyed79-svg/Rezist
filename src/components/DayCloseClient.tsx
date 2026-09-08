"use client";

import { useEffect, useState } from "react";
import { formatPKR } from "@/lib/utils";

type Branch = { id: string; name: string; type: string };
type Summary = {
  businessDate: string;
  saleCount: number;
  saleTotal: number;
  cashExpected: number;
  cardTotal: number;
  closed: boolean;
  dayClose?: { cashCounted: number; variance: number } | null;
};

export function DayCloseClient({
  branchId,
  role,
}: {
  branchId: string | null;
  role: string;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selected, setSelected] = useState(branchId || "");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cashCounted, setCashCounted] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => {
        const retail = (d.branches || []).filter((b: Branch) => b.type === "RETAIL");
        setBranches(retail);
        if (!selected && retail[0]) setSelected(retail[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/day-close?branchId=${selected}`)
      .then((r) => r.json())
      .then((d) => setSummary(d.summary));
  }, [selected]);

  async function closeDay() {
    setMsg("");
    const res = await fetch("/api/day-close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: selected, cashCounted: Number(cashCounted) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Closed. Variance ${formatPKR(data.dayClose.variance)}`);
    const refreshed = await fetch(`/api/day-close?branchId=${selected}`).then((r) => r.json());
    setSummary(refreshed.summary);
  }

  return (
    <section className="panel">
      {role === "HQ_ADMIN" ? (
        <label>
          Branch
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {summary ? (
        <div className="stat-grid compact">
          <article>
            <span>Sales</span>
            <strong>{summary.saleCount}</strong>
          </article>
          <article>
            <span>Total</span>
            <strong>{formatPKR(summary.saleTotal)}</strong>
          </article>
          <article>
            <span>Cash expected</span>
            <strong>{formatPKR(summary.cashExpected)}</strong>
          </article>
          <article>
            <span>Card / wallet</span>
            <strong>{formatPKR(summary.cardTotal)}</strong>
          </article>
        </div>
      ) : null}

      {summary?.closed ? (
        <p className="success">
          Day already closed. Counted {formatPKR(summary.dayClose?.cashCounted || 0)}, variance{" "}
          {formatPKR(summary.dayClose?.variance || 0)}.
        </p>
      ) : (
        <div className="form-inline">
          <label>
            Cash counted
            <input
              type="number"
              value={cashCounted}
              onChange={(e) => setCashCounted(e.target.value)}
              placeholder="Enter drawer count"
            />
          </label>
          <button className="btn" type="button" onClick={closeDay} disabled={!selected}>
            Close day
          </button>
        </div>
      )}
      {msg ? <p className="success">{msg}</p> : null}
    </section>
  );
}

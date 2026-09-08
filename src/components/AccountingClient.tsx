"use client";

import { useState } from "react";
import { formatPKR } from "@/lib/utils";

export function AccountingClient({
  branches,
  defaultBranchId,
  isHq,
}: {
  branches: { id: string; name: string }[];
  defaultBranchId: string;
  isHq: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [summary, setSummary] = useState<{
    saleCount: number;
    voidCount: number;
    grossSales: number;
    taxTotal: number;
    byPayment: Record<string, number>;
  } | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    const qs = new URLSearchParams({ date, format: "json" });
    if (branchId) qs.set("branchId", branchId);
    const res = await fetch(`/api/accounting?${qs}`);
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setSummary(data.summary);
  }

  function downloadCsv() {
    const qs = new URLSearchParams({ date, format: "csv" });
    if (branchId) qs.set("branchId", branchId);
    window.open(`/api/accounting?${qs}`, "_blank");
  }

  return (
    <>
      <div className="panel form-inline">
        <h2>Daily Z-report</h2>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {isHq ? (
          <label>
            Branch
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">All branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="button" className="btn" onClick={load}>
          Load summary
        </button>
        <button type="button" className="btn-sm" onClick={downloadCsv}>
          Export CSV
        </button>
      </div>
      {msg ? <p className="error">{msg}</p> : null}
      {summary ? (
        <section className="panel">
          <h2>Summary · {date}</h2>
          <div className="stat-grid">
            <article>
              <span>Gross sales</span>
              <strong>{formatPKR(summary.grossSales)}</strong>
            </article>
            <article>
              <span>Sales count</span>
              <strong>{summary.saleCount}</strong>
            </article>
            <article>
              <span>Voids</span>
              <strong>{summary.voidCount}</strong>
            </article>
            <article>
              <span>Tax</span>
              <strong>{formatPKR(summary.taxTotal)}</strong>
            </article>
          </div>
          <h3>By payment</h3>
          <ul>
            {Object.entries(summary.byPayment).map(([k, v]) => (
              <li key={k}>
                {k}: {formatPKR(v)}
              </li>
            ))}
          </ul>
          <p className="muted">CSV is ready for Excel / QuickBooks import.</p>
        </section>
      ) : null}
    </>
  );
}

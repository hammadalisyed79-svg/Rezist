"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPKR } from "@/lib/utils";

type Stub = {
  id: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  basePay: number;
  allowances: number;
  deductions: number;
  daysPresent: number;
  status: string;
  notes: string | null;
  user: { name: string; email: string };
  branch: { name: string };
};

export function PayrollClient({
  stubs,
  staff,
  branches,
  defaultBranchId,
}: {
  stubs: Stub[];
  staff: { id: string; name: string; branchId: string | null; branch: { name: string } | null }[];
  branches: { id: string; name: string }[];
  defaultBranchId: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function generate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate",
        branchId: fd.get("branchId"),
        periodStart: fd.get("periodStart"),
        periodEnd: fd.get("periodEnd"),
        dailyRate: Number(fd.get("dailyRate") || 2500),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Generated ${data.created} stub(s) from attendance`);
    router.refresh();
  }

  async function markExported(id: string) {
    const res = await fetch("/api/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "export", id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMsg(data.error || "Failed");
      return;
    }
    router.refresh();
  }

  function downloadCsv() {
    window.location.href = "/api/payroll?format=csv";
  }

  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 14);

  return (
    <>
      <form className="panel form-inline" onSubmit={generate}>
        <h2>Generate from attendance</h2>
        <label>
          Branch
          <select name="branchId" defaultValue={defaultBranchId} required>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          From
          <input name="periodStart" type="date" required defaultValue={start.toISOString().slice(0, 10)} />
        </label>
        <label>
          To
          <input name="periodEnd" type="date" required defaultValue={today.toISOString().slice(0, 10)} />
        </label>
        <label>
          Daily rate (PKR)
          <input name="dailyRate" type="number" defaultValue={2500} min={500} />
        </label>
        <button className="btn" type="submit">
          Generate stubs
        </button>
        <button className="btn-sm" type="button" onClick={downloadCsv}>
          Export CSV
        </button>
      </form>
      {msg ? <p className="success">{msg}</p> : null}
      <p className="muted">
        Staff on roster: {staff.map((s) => s.name).join(", ") || "none"} — stubs are drafts for
        QuickBooks / local payroll software.
      </p>

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Staff</th>
              <th>Branch</th>
              <th>Period</th>
              <th>Days</th>
              <th>Net</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {stubs.map((s) => {
              const net = s.basePay + s.allowances - s.deductions;
              return (
                <tr key={s.id}>
                  <td>
                    {s.user.name}
                    <br />
                    <small className="muted">{s.user.email}</small>
                  </td>
                  <td>{s.branch.name}</td>
                  <td>
                    {new Date(s.periodStart).toLocaleDateString()} –{" "}
                    {new Date(s.periodEnd).toLocaleDateString()}
                  </td>
                  <td>{s.daysPresent}</td>
                  <td>{formatPKR(net)}</td>
                  <td>
                    <span className={s.status === "EXPORTED" ? "badge status-ready" : "badge status-planned"}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    {s.status === "DRAFT" ? (
                      <button type="button" className="btn-sm" onClick={() => markExported(s.id)}>
                        Mark exported
                      </button>
                    ) : null}
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

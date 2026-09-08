"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Check = {
  id: string;
  checkType: string;
  title: string;
  status: string;
  value: number | null;
  unit: string | null;
  notes: string | null;
  checkedAt: string | Date;
  branch: { name: string };
  checkedBy: { name: string } | null;
};

const CHECK_TYPES = [
  { value: "TEMP", label: "Temperature" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "RECEIVING", label: "Receiving" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "RECALL", label: "Lot recall note" },
];

export function QualityClient({
  checks,
  branches,
  lots,
  defaultBranchId,
}: {
  checks: Check[];
  branches: { id: string; name: string; type: string }[];
  lots: { id: string; label: string; branchId: string }[];
  defaultBranchId: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [checkType, setCheckType] = useState("TEMP");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/quality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branchId: fd.get("branchId"),
        checkType: fd.get("checkType"),
        title: fd.get("title"),
        status: fd.get("status"),
        value: fd.get("value") ? Number(fd.get("value")) : null,
        unit: fd.get("unit") || null,
        relatedLotId: fd.get("relatedLotId") || null,
        notes: fd.get("notes") || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg("Check logged");
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <>
      <form className="panel form-grid" onSubmit={submit}>
        <h2>Log check</h2>
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
          Type
          <select
            name="checkType"
            value={checkType}
            onChange={(e) => setCheckType(e.target.value)}
          >
            {CHECK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Title
          <input
            name="title"
            required
            placeholder={
              checkType === "TEMP" ? "Cold display case" : checkType === "CLEANING" ? "Closing sanitize" : "Check title"
            }
          />
        </label>
        <label>
          Result
          <select name="status" defaultValue="PASS">
            <option value="PASS">Pass</option>
            <option value="FAIL">Fail</option>
            <option value="PENDING">Pending</option>
          </select>
        </label>
        {checkType === "TEMP" ? (
          <>
            <label>
              Temp
              <input name="value" type="number" step="0.1" placeholder="4.0" />
            </label>
            <label>
              Unit
              <input name="unit" defaultValue="°C" />
            </label>
          </>
        ) : (
          <>
            <input type="hidden" name="value" />
            <input type="hidden" name="unit" />
          </>
        )}
        {(checkType === "RECALL" || checkType === "RECEIVING") && (
          <label>
            Related lot
            <select name="relatedLotId" defaultValue="">
              <option value="">—</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="span-2">
          Notes
          <textarea name="notes" rows={2} placeholder="Corrective action if fail…" />
        </label>
        <button className="btn" type="submit">
          Save check
        </button>
      </form>
      {msg ? <p className="success">{msg}</p> : null}

      <section className="panel">
        <h2>Recent checks</h2>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Branch</th>
              <th>Type</th>
              <th>Title</th>
              <th>Result</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.checkedAt).toLocaleString()}</td>
                <td>{c.branch.name}</td>
                <td>{c.checkType}</td>
                <td>
                  {c.title}
                  {c.value != null ? (
                    <>
                      <br />
                      <small className="muted">
                        {c.value}
                        {c.unit}
                      </small>
                    </>
                  ) : null}
                  {c.notes ? (
                    <>
                      <br />
                      <small className="muted">{c.notes}</small>
                    </>
                  ) : null}
                </td>
                <td>
                  <span
                    className={
                      c.status === "PASS"
                        ? "badge status-ready"
                        : c.status === "FAIL"
                          ? "badge status-void"
                          : "badge status-planned"
                    }
                  >
                    {c.status}
                  </span>
                </td>
                <td>{c.checkedBy?.name || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

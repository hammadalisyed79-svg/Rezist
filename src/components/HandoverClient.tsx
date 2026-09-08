"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPKR } from "@/lib/utils";

type Handover = {
  id: string;
  tillNo: string | null;
  expectedCash: number;
  countedCash: number;
  variance: number;
  salesTotal: number;
  saleCount: number;
  wastageQty: number;
  openOrders: number;
  notes: string | null;
  status: string;
  createdAt: string | Date;
  branch: { name: string };
  fromUser: { name: string };
  toUser: { name: string } | null;
};

export function HandoverClient({
  handovers,
  branches,
  staff,
  openShifts,
  defaultBranchId,
  currentUserId,
}: {
  handovers: Handover[];
  branches: { id: string; name: string }[];
  staff: { id: string; name: string }[];
  openShifts: {
    id: string;
    tillNo: string;
    openingCash: number;
    branchId: string;
    cashier: { name: string };
    branch: { name: string };
  }[];
  defaultBranchId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/handover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        branchId: fd.get("branchId"),
        toUserId: fd.get("toUserId") || null,
        shiftId: fd.get("shiftId") || null,
        countedCash: Number(fd.get("countedCash") || 0),
        notes: fd.get("notes") || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Handover saved · variance ${formatPKR(data.handover.variance)}`);
    router.refresh();
  }

  async function accept(id: string) {
    const res = await fetch("/api/handover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept", id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <form className="panel form-grid" onSubmit={create}>
        <h2>Create handover</h2>
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
          Open shift
          <select name="shiftId" defaultValue="">
            <option value="">— snapshot without shift —</option>
            {openShifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.branch.name} · {s.tillNo} · {s.cashier.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hand to
          <select name="toUserId" defaultValue="">
            <option value="">—</option>
            {staff
              .filter((s) => s.id !== currentUserId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Counted cash (PKR)
          <input name="countedCash" type="number" step="1" required defaultValue={0} />
        </label>
        <label className="span-2">
          Notes
          <textarea name="notes" rows={2} placeholder="Drawer notes, float issues…" />
        </label>
        <button className="btn" type="submit">
          Save handover
        </button>
      </form>
      {msg ? <p className="success">{msg}</p> : null}

      <section className="panel">
        <h2>Recent handovers</h2>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Branch</th>
              <th>From → To</th>
              <th>Cash</th>
              <th>Sales</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {handovers.map((h) => (
              <tr key={h.id}>
                <td>{new Date(h.createdAt).toLocaleString()}</td>
                <td>
                  {h.branch.name}
                  {h.tillNo ? (
                    <>
                      <br />
                      <small className="muted">{h.tillNo}</small>
                    </>
                  ) : null}
                </td>
                <td>
                  {h.fromUser.name} → {h.toUser?.name || "—"}
                </td>
                <td>
                  Exp {formatPKR(h.expectedCash)} / Cnt {formatPKR(h.countedCash)}
                  <br />
                  <small className={h.variance !== 0 ? "error" : "muted"}>
                    var {formatPKR(h.variance)}
                  </small>
                </td>
                <td>
                  {formatPKR(h.salesTotal)} · {h.saleCount} txns
                  <br />
                  <small className="muted">
                    waste {h.wastageQty} · open orders {h.openOrders}
                  </small>
                </td>
                <td>
                  <span
                    className={
                      h.status === "ACCEPTED" || h.status === "CLOSED"
                        ? "badge status-ready"
                        : "badge status-planned"
                    }
                  >
                    {h.status}
                  </span>
                </td>
                <td>
                  {h.status === "OPEN" ? (
                    <button type="button" className="btn-sm" onClick={() => accept(h.id)}>
                      Accept
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

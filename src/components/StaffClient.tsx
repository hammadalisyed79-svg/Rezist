"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPKR } from "@/lib/utils";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  branch?: { name: string } | null;
  managerPinHash: boolean;
  performance: { count: number; total: number };
};

type Attendance = {
  id: string;
  status: string;
  checkIn: string | Date | null;
  checkOut: string | Date | null;
  user: { name: string };
  branch: { name: string };
};

export function StaffClient({
  users,
  attendance,
  canSetPin,
}: {
  users: UserRow[];
  attendance: Attendance[];
  canSetPin: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [pin, setPin] = useState("");

  async function check(action: "checkIn" | "checkOut") {
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(action === "checkIn" ? "Checked in" : "Checked out");
    router.refresh();
  }

  async function savePin() {
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setPin", pin }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "PIN failed");
      return;
    }
    setMsg("Manager PIN saved");
    setPin("");
    router.refresh();
  }

  return (
    <>
      <div className="panel form-inline">
        <h2>Today attendance</h2>
        <button type="button" className="btn" onClick={() => check("checkIn")}>
          Check in
        </button>
        <button type="button" className="btn-sm" onClick={() => check("checkOut")}>
          Check out
        </button>
      </div>
      {canSetPin ? (
        <div className="panel form-inline">
          <h2>Manager PIN (POS voids)</h2>
          <input
            type="password"
            placeholder="New PIN (4+ digits)"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          <button type="button" className="btn" onClick={savePin}>
            Save PIN
          </button>
        </div>
      ) : null}
      {msg ? <p className="success">{msg}</p> : null}

      <section className="panel">
        <h2>Checked in today</h2>
        <table>
          <thead>
            <tr>
              <th>Staff</th>
              <th>Branch</th>
              <th>In</th>
              <th>Out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a) => (
              <tr key={a.id}>
                <td>{a.user.name}</td>
                <td>{a.branch.name}</td>
                <td>{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : "—"}</td>
                <td>{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : "—"}</td>
                <td>{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!attendance.length ? <p className="muted">No check-ins yet today.</p> : null}
      </section>

      <section className="panel">
        <h2>Team · 7-day POS performance</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Branch</th>
              <th>Txns</th>
              <th>Sales</th>
              <th>PIN</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.role}</td>
                <td>{u.branch?.name || "HQ"}</td>
                <td>{u.performance.count}</td>
                <td>{formatPKR(u.performance.total)}</td>
                <td>{u.managerPinHash ? "Set" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

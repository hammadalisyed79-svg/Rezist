"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Alert = {
  id: string;
  severity: string;
  type: string;
  title: string;
  body: string;
  readAt: string | Date | null;
  createdAt: string | Date;
  branch: { name: string } | null;
};

export function AlertsClient({ alerts }: { alerts: Alert[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function markRead(id: string) {
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", id }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMsg(data.error || "Failed");
      return;
    }
    router.refresh();
  }

  async function markAll() {
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "readAll" }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMsg(data.error || "Failed");
      return;
    }
    setMsg("All marked read");
    router.refresh();
  }

  async function refresh() {
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Refreshed · ${data.created} new`);
    router.refresh();
  }

  return (
    <>
      <div className="toolbar">
        <button type="button" className="btn-sm" onClick={refresh}>
          Refresh alerts
        </button>
        <button type="button" className="btn-sm" onClick={markAll}>
          Mark all read
        </button>
      </div>
      {msg ? <p className="success">{msg}</p> : null}
      <section className="panel">
        {alerts.length === 0 ? (
          <p className="muted">No alerts — ops look clean.</p>
        ) : (
          <ul className="bi-rank">
            {alerts.map((a) => (
              <li key={a.id} style={{ opacity: a.readAt ? 0.55 : 1 }}>
                <div>
                  <strong>
                    <span
                      className={
                        a.severity === "CRITICAL"
                          ? "badge status-void"
                          : a.severity === "INFO"
                            ? "badge status-planned"
                            : "badge status-ready"
                      }
                    >
                      {a.severity}
                    </span>{" "}
                    {a.title}
                  </strong>
                  <small>
                    {a.branch?.name || "Network"} · {a.type} ·{" "}
                    {new Date(a.createdAt).toLocaleString()}
                    <br />
                    {a.body}
                  </small>
                </div>
                {!a.readAt ? (
                  <button type="button" className="btn-sm" onClick={() => markRead(a.id)}>
                    Mark read
                  </button>
                ) : (
                  <span className="muted">Read</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

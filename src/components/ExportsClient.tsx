"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Preset = {
  id: string;
  name: string;
  reportType: string;
  cadence: string;
  active: boolean;
  notes: string | null;
  lastRunAt: string | Date | null;
};

const TYPES = ["SCOREBOARD", "SALES", "WASTAGE", "SUPPLIERS", "HANDOVER"];

export function ExportsClient({ presets }: { presets: Preset[] }) {
  const router = useRouter();
  const [days, setDays] = useState(7);
  const [msg, setMsg] = useState("");

  function download(type: string) {
    window.location.href = `/api/exports?type=${type}&days=${days}`;
  }

  async function runPreset(id: string, type: string) {
    download(type);
    await fetch("/api/exports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markRun", id }),
    });
    setMsg(`Exported ${type}`);
    router.refresh();
  }

  return (
    <>
      <div className="toolbar">
        <label>
          Period (days){" "}
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(Number(e.target.value) || 7)}
            style={{ width: 72 }}
          />
        </label>
        {TYPES.map((t) => (
          <button key={t} type="button" className="btn-sm" onClick={() => download(t)}>
            {t}
          </button>
        ))}
      </div>
      {msg ? <p className="success">{msg}</p> : null}

      <section className="panel">
        <h2>Presets</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Cadence</th>
              <th>Last run</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {presets.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.name}
                  {p.notes ? (
                    <>
                      <br />
                      <small className="muted">{p.notes}</small>
                    </>
                  ) : null}
                </td>
                <td>{p.reportType}</td>
                <td>{p.cadence}</td>
                <td>
                  {p.lastRunAt ? new Date(p.lastRunAt).toLocaleString() : "Never"}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-sm"
                    onClick={() => runPreset(p.id, p.reportType)}
                    disabled={!p.active}
                  >
                    Run CSV
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

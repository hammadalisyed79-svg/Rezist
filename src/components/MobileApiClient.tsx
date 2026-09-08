"use client";

import { useState } from "react";

export function MobileApiClient() {
  const [token, setToken] = useState("");
  const [label, setLabel] = useState("Manager phone");
  const [preview, setPreview] = useState("");
  const [msg, setMsg] = useState("");

  async function mint() {
    const res = await fetch("/api/mobile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mint", label }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setToken(data.token);
    setMsg("Token created — copy it now");
  }

  async function test() {
    if (!token) {
      setMsg("Mint or paste a token first");
      return;
    }
    const res = await fetch("/api/mobile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "Unauthorized");
      return;
    }
    setPreview(JSON.stringify(data, null, 2));
    setMsg("API OK");
  }

  return (
    <>
      <section className="panel form-inline">
        <h2>Mint bearer token</h2>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" />
        <button type="button" className="btn" onClick={mint}>
          Create token
        </button>
        <button type="button" className="btn-sm" onClick={test}>
          Test GET /api/mobile
        </button>
      </section>
      {msg ? <p className="success">{msg}</p> : null}
      {token ? (
        <section className="panel">
          <h2>Bearer token</h2>
          <code style={{ wordBreak: "break-all" }}>{token}</code>
          <p className="muted">Header: Authorization: Bearer &lt;token&gt;</p>
        </section>
      ) : null}
      {preview ? (
        <section className="panel">
          <h2>Sample payload</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{preview}</pre>
        </section>
      ) : null}
      <section className="panel">
        <h2>Endpoints</h2>
        <ul>
          <li>
            <code>GET /api/mobile</code> — today KPIs, open orders, low stock
          </li>
          <li>
            <code>POST /api/mobile</code> {"{ action: \"orderStatus\", orderId, status }"}
          </li>
        </ul>
      </section>
    </>
  );
}

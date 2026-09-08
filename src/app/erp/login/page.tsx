"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@rezist.pk");
  const [password, setPassword] = useState("rezist123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Login failed");
      return;
    }
    router.push("/erp");
    router.refresh();
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <p className="eyebrow">Rezist Operations</p>
        <h1>ERP Sign in</h1>
        <p className="muted">HQ, branch managers, and cashiers</p>
        {error ? <p className="error">{error}</p> : null}
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="hint">Demo: admin@rezist.pk / rezist123</p>
        <Link href="/">← Back to website</Link>
      </form>
    </div>
  );
}

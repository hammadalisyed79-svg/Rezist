"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";

type Branch = { id: string; name: string; city: string };

export function LocationPill({ cities }: { cities: string[] }) {
  const router = useRouter();
  const { branchId, setBranchId } = useCart();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [city, setCity] = useState(cities[0] || "");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/public/catalog")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.branches || []) as Branch[];
        setBranches(list);
        if (!city && list[0]) setCity(list[0].city);
        if (!branchId && list[0]) setBranchId(list[0].id);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const cityBranches = useMemo(
    () => branches.filter((b) => b.city === city),
    [branches, city]
  );
  const selected = branches.find((b) => b.id === branchId) || cityBranches[0];

  return (
    <div className="lz-location" ref={rootRef}>
      <button
        type="button"
        className="lz-location-pill"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="lz-location-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="lz-pin" aria-hidden />
        <span className="lz-location-label">
          {loading
            ? "Finding lounge…"
            : selected
              ? `${selected.city} · ${selected.name.replace(/^Rezist\s*/i, "").slice(0, 18)}`
              : city || "Select city"}
        </span>
        <span className="lz-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="lz-location-backdrop"
            aria-label="Close location picker"
            onClick={() => setOpen(false)}
          />
          <div
            id="lz-location-panel"
            className="lz-location-menu"
            role="dialog"
            aria-label="Choose branch"
          >
            <p className="lz-location-title">Your nearest lounge</p>
            <label>
              City
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  const first = branches.find((b) => b.city === e.target.value);
                  if (first) setBranchId(first.id);
                }}
              >
                {(cities.length ? cities : [...new Set(branches.map((b) => b.city))]).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Branch
              <select
                value={selected?.id || ""}
                onChange={(e) => {
                  setBranchId(e.target.value);
                }}
              >
                {cityBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="lz-location-actions">
              <button
                type="button"
                className="btn-sm"
                onClick={() => {
                  setOpen(false);
                  if (selected) router.push(`/menu?branchId=${selected.id}`);
                }}
              >
                Browse menu
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setOpen(false);
                  if (selected) router.push(`/order?branchId=${selected.id}`);
                }}
              >
                Start order
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { nearestCity } from "@/lib/geo";

type Branch = { id: string; name: string; city: string };

export function LocationPill({ cities }: { cities: string[] }) {
  const router = useRouter();
  const { branchId, setBranchId } = useCart();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [city, setCity] = useState(cities[0] || "");
  const [liveHint, setLiveHint] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/public/catalog")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.branches || []) as Branch[];
        setBranches(list);
        if (!city && list[0]) setCity(list[0].city);
        if (!branchId && list[0]) setBranchId(list[0].id);
        const sel = list.find((b) => b.id === branchId);
        if (sel) setCity(sel.city);
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

  const allCities = cities.length ? cities : [...new Set(branches.map((b) => b.city))];
  const cityBranches = useMemo(
    () => branches.filter((b) => b.city === city),
    [branches, city]
  );
  const selected = branches.find((b) => b.id === branchId) || cityBranches[0];

  function detectLocation() {
    if (!navigator.geolocation) {
      setLiveHint("Location unavailable — pick a city.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const match = nearestCity(pos.coords.latitude, pos.coords.longitude, allCities);
        if (match) {
          setCity(match);
          const first = branches.find((b) => b.city === match);
          if (first) setBranchId(first.id);
          setLiveHint(`Live match · ${match}`);
        }
        setLocating(false);
      },
      () => {
        setLiveHint("Allow location or choose a city.");
        setLocating(false);
      },
      { timeout: 10000 }
    );
  }

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
              ? `${selected.city}`
              : city || "Select city"}
        </span>
        {selected ? (
          <span className="lz-location-sub">{selected.name.replace(/^Rezist\s*/i, "").slice(0, 16)}</span>
        ) : null}
        <span className="lz-live-dot" title="Ordering live" aria-hidden />
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
            <p className="lz-location-title">Your lounge</p>
            <p className="lz-location-live">Menus & stock update for your city in real time.</p>
            <button type="button" className="lz-geo-btn" onClick={detectLocation} disabled={locating}>
              {locating ? "Detecting…" : "Use my location"}
            </button>
            {liveHint ? <p className="lz-gate-hint">{liveHint}</p> : null}

            <div className="lz-city-chips">
              {allCities.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={city === c ? "active" : undefined}
                  onClick={() => {
                    setCity(c);
                    const first = branches.find((b) => b.city === c);
                    if (first) setBranchId(first.id);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>

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

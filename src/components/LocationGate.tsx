"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { brand } from "@/lib/brand";
import { useCart } from "@/components/CartProvider";
import { nearestCity } from "@/lib/geo";

type Branch = { id: string; name: string; city: string; address?: string | null };

const GATE_KEY = "rezist_location_gate_v1";

export function LocationGate({
  cities,
  branches,
}: {
  cities: string[];
  branches: Branch[];
}) {
  const router = useRouter();
  const { branchId, setBranchId, setFulfillment, fulfillment, ready } = useCart();
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState(cities[0] || "");
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState("");

  const cityBranches = useMemo(
    () => branches.filter((b) => b.city === city),
    [branches, city]
  );
  const [branch, setBranch] = useState("");

  useEffect(() => {
    if (!ready) return;
    try {
      if (localStorage.getItem(GATE_KEY)) return;
    } catch {
      /* ignore */
    }
    if (branchId) {
      try {
        localStorage.setItem(GATE_KEY, "1");
      } catch {
        /* ignore */
      }
      return;
    }
    setOpen(true);
  }, [ready, branchId]);

  useEffect(() => {
    if (cityBranches[0] && !cityBranches.some((b) => b.id === branch)) {
      setBranch(cityBranches[0].id);
    }
  }, [city, cityBranches, branch]);

  function markDone() {
    try {
      localStorage.setItem(GATE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function confirm(go: "menu" | "order") {
    if (!branch) return;
    setBranchId(branch);
    markDone();
    setOpen(false);
    router.push(go === "order" ? `/order?branchId=${branch}` : `/menu?branchId=${branch}`);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setHint("Location not available on this device — pick a city below.");
      return;
    }
    setLocating(true);
    setHint("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const match = nearestCity(pos.coords.latitude, pos.coords.longitude, cities);
        if (match) {
          setCity(match);
          const first = branches.find((b) => b.city === match);
          if (first) setBranch(first.id);
          setHint(`Nearest lounge city: ${match}`);
        } else {
          setHint("Couldn’t match a city — please choose manually.");
        }
        setLocating(false);
      },
      () => {
        setHint("Permission denied — choose your city below.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  if (!open) return null;

  return (
    <div className="lz-gate" role="dialog" aria-modal="true" aria-labelledby="lz-gate-title">
      <div className="lz-gate-card">
        <p className="eyebrow">Live ordering</p>
        <h2 id="lz-gate-title">Where are you ordering from?</h2>
        <p className="lz-gate-lead">
          Choose your city and lounge so menus, stock and delivery match your nearest Rezist —
          across {brand.cities.length} cities.
        </p>

        <button
          type="button"
          className="lz-gate-geo"
          onClick={useMyLocation}
          disabled={locating}
        >
          {locating ? "Detecting…" : "Use my current location"}
        </button>
        {hint ? <p className="lz-gate-hint">{hint}</p> : null}

        <div className="lz-gate-cities" role="listbox" aria-label="Cities">
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={city === c}
              className={city === c ? "active" : undefined}
              onClick={() => setCity(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="fulfill-toggle lz-gate-fulfill" role="group" aria-label="Fulfillment">
          <button
            type="button"
            className={fulfillment === "PICKUP" ? "active" : undefined}
            onClick={() => setFulfillment("PICKUP")}
          >
            Pickup
          </button>
          <button
            type="button"
            className={fulfillment === "DELIVERY" ? "active" : undefined}
            onClick={() => setFulfillment("DELIVERY")}
          >
            Delivery
          </button>
        </div>

        <label className="lz-gate-branch">
          Lounge
          <select value={branch} onChange={(e) => setBranch(e.target.value)}>
            {cityBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        {cityBranches[0]?.address ? (
          <p className="muted lz-gate-addr">{cityBranches.find((b) => b.id === branch)?.address}</p>
        ) : null}

        <div className="lz-gate-actions">
          <button type="button" className="btn" disabled={!branch} onClick={() => confirm("order")}>
            Start order
          </button>
          <button
            type="button"
            className="btn-ghost"
            disabled={!branch}
            onClick={() => confirm("menu")}
          >
            Browse menu
          </button>
        </div>
        <button
          type="button"
          className="lz-gate-skip"
          onClick={() => {
            if (branch || cityBranches[0]) {
              setBranchId(branch || cityBranches[0].id);
            }
            markDone();
            setOpen(false);
          }}
        >
          Continue exploring
        </button>
      </div>
    </div>
  );
}

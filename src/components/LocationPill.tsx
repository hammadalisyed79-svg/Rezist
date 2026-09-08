"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartProvider";

type Branch = { id: string; name: string; city: string };

export function LocationPill({ cities }: { cities: string[] }) {
  const router = useRouter();
  const { branchId, setBranchId } = useCart();
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [city, setCity] = useState(cities[0] || "");

  useEffect(() => {
    fetch("/api/public/catalog")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.branches || []) as Branch[];
        setBranches(list);
        if (!city && list[0]) setCity(list[0].city);
        if (!branchId && list[0]) setBranchId(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  const cityBranches = useMemo(
    () => branches.filter((b) => b.city === city),
    [branches, city]
  );
  const selected = branches.find((b) => b.id === branchId) || cityBranches[0];

  return (
    <div className="lz-location">
      <button type="button" className="lz-location-pill" onClick={() => setOpen((v) => !v)}>
        <span className="lz-pin" aria-hidden />
        <span className="lz-location-label">
          {selected ? `${selected.city}` : city || "Select city"}
        </span>
        <span className="lz-caret">▾</span>
      </button>
      {open ? (
        <div className="lz-location-menu">
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
                setOpen(false);
                router.push(`/menu?branchId=${e.target.value}`);
              }}
            >
              {cityBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-sm"
            onClick={() => {
              setOpen(false);
              if (selected) router.push(`/order?branchId=${selected.id}`);
            }}
          >
            Start order
          </button>
        </div>
      ) : null}
    </div>
  );
}

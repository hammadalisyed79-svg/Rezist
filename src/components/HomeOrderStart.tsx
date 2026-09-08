"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";

type Branch = { id: string; name: string; city: string };

export function HomeOrderStart({
  branches,
  cities,
}: {
  branches: Branch[];
  cities: string[];
}) {
  const router = useRouter();
  const { setBranchId, setFulfillment, fulfillment } = useCart();
  const [city, setCity] = useState(cities[0] || "");
  const cityBranches = branches.filter((b) => b.city === city);
  const [branch, setBranch] = useState(cityBranches[0]?.id || "");

  function start() {
    if (!branch) return;
    setBranchId(branch);
    setFulfillment(fulfillment);
    router.push(`/order?branchId=${branch}`);
  }

  return (
    <div className="order-start">
      <div className="fulfill-toggle">
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
      <label>
        Select city / region
        <select
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            const first = branches.find((b) => b.city === e.target.value);
            setBranch(first?.id || "");
          }}
        >
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label>
        Select branch
        <select value={branch} onChange={(e) => setBranch(e.target.value)}>
          {cityBranches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn" onClick={start} disabled={!branch}>
        Start ordering
      </button>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";

export function AnalyticsClient({ days, isHq }: { days: number; isHq: boolean }) {
  const router = useRouter();
  const options = [7, 14, 30, 60];

  return (
    <div className="toolbar">
      {options.map((d) => (
        <button
          key={d}
          type="button"
          className={d === days ? "btn" : "btn-sm"}
          onClick={() => router.push(`/erp/analytics?days=${d}`)}
        >
          {d}d
        </button>
      ))}
      {isHq ? <span className="muted">HQ view · all company-owned branches</span> : null}
    </div>
  );
}

import Link from "next/link";
import { ErpPage, requireErpUser } from "@/lib/erp";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { buildDemandForecast } from "@/lib/forecast";
import { ForecastClient } from "@/components/ForecastClient";

export default async function ForecastPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "forecast")) redirect("/erp");

  const branchId = user.role === "HQ_ADMIN" ? undefined : user.branchId || undefined;
  const rows = await buildDemandForecast({ branchId });

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 5</p>
          <h1>Demand forecast</h1>
          <p className="muted">
            14-day moving average + trend · weekend buffer · bake gap vs on-hand.
          </p>
        </div>
        <Link className="btn" href="/erp/production">
          Open production
        </Link>
      </header>
      <ForecastClient rows={rows} />
    </ErpPage>
  );
}

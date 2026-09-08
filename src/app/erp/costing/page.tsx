import { ErpPage, requireErpUser } from "@/lib/erp";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { getProductCosting } from "@/lib/costing";
import { CostingClient } from "@/components/CostingClient";

export default async function CostingPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "costing")) redirect("/erp");
  const rows = await getProductCosting();

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Margins</p>
          <h1>Recipe costing</h1>
          <p className="muted">Live BOM cost from ingredient prices. Alerts under 35% margin.</p>
        </div>
      </header>
      <CostingClient rows={rows} isHq={user.role === "HQ_ADMIN"} />
    </ErpPage>
  );
}

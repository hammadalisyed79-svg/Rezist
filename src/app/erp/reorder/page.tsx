import { ErpPage, requireErpUser } from "@/lib/erp";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { buildReorderSuggestions } from "@/lib/reorder";
import { ReorderClient } from "@/components/ReorderClient";

export default async function ReorderPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "reorder")) redirect("/erp");
  const all = await buildReorderSuggestions();
  const suggestions =
    user.role === "HQ_ADMIN" ? all : all.filter((s) => s.branchId === user.branchId);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Automation</p>
          <h1>Reorder suggestions</h1>
          <p className="muted">
            Low stock → transfer from warehouse/kitchen, or purchase raw materials.
          </p>
        </div>
      </header>
      <ReorderClient suggestions={suggestions} />
    </ErpPage>
  );
}

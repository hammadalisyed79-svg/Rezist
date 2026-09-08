import { ErpPage, requireErpUser } from "@/lib/erp";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { MobileApiClient } from "@/components/MobileApiClient";

export default async function MobileApiPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "mobileApi")) redirect("/erp");

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 4</p>
          <h1>Manager mobile API</h1>
          <p className="muted">Bearer tokens for branch manager apps and integrations.</p>
        </div>
      </header>
      <MobileApiClient />
    </ErpPage>
  );
}

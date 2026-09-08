import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { AccountingClient } from "@/components/AccountingClient";

export default async function AccountingPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "accounting")) redirect("/erp");

  const branches = await prisma.branch.findMany({
    where: { active: true, type: "RETAIL" },
    orderBy: { name: "asc" },
  });

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Finance</p>
          <h1>Accounting export</h1>
          <p className="muted">Daily Z-report with payment split — download CSV for books.</p>
        </div>
      </header>
      <AccountingClient
        branches={branches}
        defaultBranchId={user.branchId || ""}
        isHq={user.role === "HQ_ADMIN"}
      />
    </ErpPage>
  );
}

import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { CustomersClient } from "@/components/CustomersClient";

export default async function CustomersPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "crm")) redirect("/erp");

  const customers = await prisma.customer.findMany({
    include: {
      preferredBranch: true,
      _count: { select: { sales: true, orders: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">CRM · Phase 5</p>
          <h1>Customers & loyalty</h1>
          <p className="muted">
            Tiers · redeem at POS · birthday cake reminders · Rs 100 = 1 pt (tier bonus).
          </p>
        </div>
      </header>
      <CustomersClient customers={customers} />
    </ErpPage>
  );
}

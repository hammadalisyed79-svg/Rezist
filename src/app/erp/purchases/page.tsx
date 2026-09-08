import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { PurchaseClient } from "@/components/PurchaseClient";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

export default async function PurchasesPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "purchases")) redirect("/erp");

  const [branches, products, suppliers, purchases] = await Promise.all([
    prisma.branch.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true, OR: [{ type: "RAW" }, { type: "SEMI" }] },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.purchaseOrder.findMany({
      where: user.role === "HQ_ADMIN" ? undefined : { branchId: user.branchId || undefined },
      include: {
        supplier: true,
        branch: true,
        lines: { include: { product: true } },
      },
      orderBy: { orderedAt: "desc" },
      take: 40,
    }),
  ]);

  const stockBranches = branches.filter((b) => b.type === "WAREHOUSE" || b.type === "CENTRAL_KITCHEN");
  const defaultBranchId =
    user.branchId ||
    stockBranches[0]?.id ||
    branches.find((b) => b.type === "WAREHOUSE")?.id ||
    branches[0]?.id ||
    "";

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Procurement</p>
          <h1>Purchases & GRN</h1>
          <p className="muted">Order from suppliers, receive into warehouse / kitchen stock.</p>
        </div>
      </header>
      <PurchaseClient
        branches={stockBranches.length ? stockBranches : branches}
        products={products}
        suppliers={suppliers}
        purchases={purchases}
        defaultBranchId={defaultBranchId}
        isHq={user.role === "HQ_ADMIN"}
      />
    </ErpPage>
  );
}

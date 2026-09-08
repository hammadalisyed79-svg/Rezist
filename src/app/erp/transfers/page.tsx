import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { TransferClient } from "@/components/TransferClient";

export default async function TransfersPage() {
  const user = await requireErpUser();
  const [branches, products, transfers] = await Promise.all([
    prisma.branch.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { trackStock: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockTransfer.findMany({
      where:
        user.role === "HQ_ADMIN"
          ? undefined
          : {
              OR: [
                { fromBranchId: user.branchId || "" },
                { toBranchId: user.branchId || "" },
              ],
            },
      include: {
        fromBranch: true,
        toBranch: true,
        lines: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Logistics</p>
          <h1>Branch transfers</h1>
        </div>
      </header>
      <TransferClient
        branches={branches}
        products={products}
        transfers={transfers}
        canCreate={user.role !== "CASHIER"}
        userBranchId={user.branchId}
        role={user.role}
      />
    </ErpPage>
  );
}

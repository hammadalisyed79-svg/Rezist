import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { WastageClient } from "@/components/WastageClient";

export default async function WastagePage() {
  const user = await requireErpUser();
  const [products, records, branches] = await Promise.all([
    prisma.product.findMany({
      where: { trackStock: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.wastageRecord.findMany({
      where: user.role === "HQ_ADMIN" ? undefined : { branchId: user.branchId || undefined },
      include: { product: true, branch: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.branch.findMany({ where: { active: true, type: "RETAIL" } }),
  ]);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Loss control</p>
          <h1>Wastage</h1>
        </div>
      </header>
      <WastageClient
        products={products}
        records={records}
        branches={branches}
        defaultBranchId={user.branchId || branches[0]?.id}
        role={user.role}
      />
    </ErpPage>
  );
}

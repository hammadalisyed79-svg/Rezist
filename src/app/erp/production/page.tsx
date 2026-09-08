import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { ProductionClient } from "@/components/ProductionClient";

export default async function ProductionPage() {
  const user = await requireErpUser();
  const [branches, products, batches] = await Promise.all([
    prisma.branch.findMany({
      where: { active: true, type: { in: ["CENTRAL_KITCHEN", "RETAIL"] } },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { type: "FINISHED", active: true },
      orderBy: { name: "asc" },
    }),
    prisma.productionBatch.findMany({
      where: user.role === "HQ_ADMIN" ? undefined : { branchId: user.branchId || undefined },
      include: { branch: true, lines: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Hybrid production</p>
          <h1>Bake plan & batches</h1>
        </div>
      </header>
      <ProductionClient
        branches={branches}
        products={products}
        batches={batches}
        canManage={user.role !== "CASHIER"}
        defaultBranchId={user.branchId || branches[0]?.id}
      />
    </ErpPage>
  );
}

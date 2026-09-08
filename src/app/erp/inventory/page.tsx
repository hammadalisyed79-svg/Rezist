import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { InventoryAdjustForm } from "@/components/InventoryAdjustForm";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const user = await requireErpUser();
  const sp = await searchParams;
  const branches = await prisma.branch.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const branchId =
    user.role === "HQ_ADMIN"
      ? sp.branchId || branches[0]?.id
      : user.branchId || undefined;

  const items = branchId
    ? await prisma.inventoryItem.findMany({
        where: { branchId },
        include: { product: true, branch: true },
        orderBy: { product: { name: "asc" } },
      })
    : [];

  const products = await prisma.product.findMany({
    where: { trackStock: true, active: true },
    orderBy: { name: "asc" },
  });

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Stock</p>
          <h1>Inventory</h1>
        </div>
      </header>

      <BranchFilter branches={branches} current={branchId} show={user.role === "HQ_ADMIN"} />

      {user.role !== "CASHIER" && branchId ? (
        <InventoryAdjustForm branchId={branchId} products={products} />
      ) : null}

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>UOM</th>
              <th>Reorder</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className={i.quantity <= i.reorderLevel ? "warn-row" : undefined}>
                <td>{i.product.name}</td>
                <td>{i.product.sku}</td>
                <td>{i.quantity}</td>
                <td>{i.product.uom}</td>
                <td>{i.reorderLevel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ErpPage>
  );
}

function BranchFilter({
  branches,
  current,
  show,
}: {
  branches: { id: string; name: string }[];
  current?: string;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <div className="toolbar">
      {branches.map((b) => (
        <a
          key={b.id}
          className={b.id === current ? "chip active" : "chip"}
          href={`/erp/inventory?branchId=${b.id}`}
        >
          {b.name}
        </a>
      ))}
    </div>
  );
}

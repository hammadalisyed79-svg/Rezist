import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { OrdersClient } from "@/components/OrdersClient";
import { formatPKR } from "@/lib/utils";

export default async function OrdersPage() {
  const user = await requireErpUser();
  const orders = await prisma.onlineOrder.findMany({
    where: user.role === "HQ_ADMIN" ? undefined : { branchId: user.branchId || undefined },
    include: { lines: { include: { product: true } }, branch: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Branch operations</p>
          <h1>Kitchen board</h1>
          <p className="muted">
            New → Confirmed → Preparing → Ready → Done. WhatsApp opens when you update the customer.
          </p>
        </div>
      </header>
      <OrdersClient
        orders={orders.map((o) => ({
          ...o,
          totalLabel: formatPKR(o.total),
          createdLabel: o.createdAt.toISOString(),
        }))}
      />
    </ErpPage>
  );
}

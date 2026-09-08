import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { DeliveryClient } from "@/components/DeliveryClient";

export default async function DeliveryPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "delivery")) redirect("/erp");

  const branchId = user.role === "HQ_ADMIN" ? undefined : user.branchId || undefined;
  const [riders, orders, branches] = await Promise.all([
    prisma.deliveryRider.findMany({
      where: {
        active: true,
        ...(user.role === "HQ_ADMIN"
          ? {}
          : { OR: [{ branchId: user.branchId || "" }, { branchId: null }] }),
      },
      orderBy: { name: "asc" },
    }),
    prisma.onlineOrder.findMany({
      where: {
        fulfillment: "DELIVERY",
        ...(branchId ? { branchId } : {}),
      },
      include: { branch: true, rider: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.branch.findMany({
      where: { active: true, type: "RETAIL" },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 4</p>
          <h1>Delivery & marketplace</h1>
          <p className="muted">Riders, dispatch board, Foodpanda/Careem import.</p>
        </div>
      </header>
      <DeliveryClient
        riders={riders}
        orders={orders}
        branches={branches}
        defaultBranchId={user.branchId || branches[0]?.id || ""}
      />
    </ErpPage>
  );
}

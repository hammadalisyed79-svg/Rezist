import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { refreshOpsNotifications } from "@/lib/notifications";
import { AlertsClient } from "@/components/AlertsClient";

export default async function AlertsPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "alerts")) redirect("/erp");

  await refreshOpsNotifications();

  const branchId = user.role === "HQ_ADMIN" ? undefined : user.branchId || undefined;
  const alerts = await prisma.opsNotification.findMany({
    where: {
      ...(branchId
        ? { OR: [{ branchId }, { branchId: null }] }
        : {}),
    },
    include: { branch: true },
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take: 80,
  });

  const unread = alerts.filter((a) => !a.readAt).length;

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 6</p>
          <h1>Ops alerts</h1>
          <p className="muted">
            Low stock, overdue transfers, food-safety fails — live refresh on open.
          </p>
        </div>
      </header>
      <section className="stat-grid compact">
        <article>
          <span>Unread</span>
          <strong>{unread}</strong>
        </article>
        <article>
          <span>Total shown</span>
          <strong>{alerts.length}</strong>
        </article>
      </section>
      <AlertsClient alerts={alerts} />
    </ErpPage>
  );
}

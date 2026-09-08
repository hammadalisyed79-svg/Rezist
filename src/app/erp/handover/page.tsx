import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { HandoverClient } from "@/components/HandoverClient";

export default async function HandoverPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "handover")) redirect("/erp");

  const branchId = user.role === "HQ_ADMIN" ? undefined : user.branchId || undefined;
  const [handovers, branches, staff, openShifts] = await Promise.all([
    prisma.shiftHandover.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: true, fromUser: true, toUser: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.branch.findMany({
      where: { active: true, type: "RETAIL" },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        active: true,
        role: { in: ["BRANCH_MANAGER", "CASHIER"] },
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { name: "asc" },
    }),
    prisma.posShift.findMany({
      where: {
        status: "OPEN",
        ...(branchId ? { branchId } : {}),
      },
      include: { cashier: true, branch: true },
    }),
  ]);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 6</p>
          <h1>Shift handover</h1>
          <p className="muted">
            Till reconciliation between cashiers — expected vs counted cash, sales snapshot, open orders.
          </p>
        </div>
      </header>
      <HandoverClient
        handovers={handovers}
        branches={branches}
        staff={staff}
        openShifts={openShifts}
        defaultBranchId={user.branchId || branches[0]?.id || ""}
        currentUserId={user.id}
      />
    </ErpPage>
  );
}

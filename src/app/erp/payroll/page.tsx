import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { formatPKR } from "@/lib/utils";
import { PayrollClient } from "@/components/PayrollClient";

export default async function PayrollPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "payroll")) redirect("/erp");

  const branchId = user.role === "HQ_ADMIN" ? undefined : user.branchId || undefined;

  const [stubs, staff, branches] = await Promise.all([
    prisma.payrollStub.findMany({
      where: branchId ? { branchId } : undefined,
      include: { user: true, branch: true },
      orderBy: { periodEnd: "desc" },
      take: 60,
    }),
    prisma.user.findMany({
      where: {
        active: true,
        role: { in: ["BRANCH_MANAGER", "CASHIER"] },
        ...(branchId ? { branchId } : {}),
      },
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { active: true, type: "RETAIL" },
      orderBy: { name: "asc" },
    }),
  ]);

  const draftTotal = stubs
    .filter((s) => s.status === "DRAFT")
    .reduce((a, s) => a + s.basePay + s.allowances - s.deductions, 0);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 5</p>
          <h1>Payroll stubs</h1>
          <p className="muted">
            Attendance-linked draft payslips for export to external payroll — not a full HRIS.
          </p>
        </div>
      </header>
      <section className="stat-grid compact">
        <article>
          <span>Stubs</span>
          <strong>{stubs.length}</strong>
        </article>
        <article>
          <span>Draft net</span>
          <strong>{formatPKR(draftTotal)}</strong>
        </article>
      </section>
      <PayrollClient
        stubs={stubs}
        staff={staff}
        branches={branches}
        defaultBranchId={user.branchId || branches[0]?.id || ""}
      />
    </ErpPage>
  );
}

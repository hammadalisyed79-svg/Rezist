import { ErpPage, requireErpUser } from "@/lib/erp";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

function dayStart(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function StaffPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "staff")) redirect("/erp");

  const { prisma } = await import("@/lib/prisma");
  const { StaffClient } = await import("@/components/StaffClient");

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const users = await prisma.user.findMany({
    where:
      user.role === "HQ_ADMIN"
        ? { active: true }
        : { active: true, OR: [{ branchId: user.branchId || "" }, { id: user.id }] },
    include: { branch: true },
    orderBy: { name: "asc" },
  });

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: since },
      voided: false,
      ...(user.role === "HQ_ADMIN" ? {} : { branchId: user.branchId || undefined }),
    },
    select: { cashierId: true, total: true },
  });
  const perf = new Map<string, { count: number; total: number }>();
  for (const s of sales) {
    if (!s.cashierId) continue;
    const cur = perf.get(s.cashierId) || { count: 0, total: 0 };
    cur.count += 1;
    cur.total += s.total;
    perf.set(s.cashierId, cur);
  }

  const attendance = await prisma.attendance.findMany({
    where: {
      workDate: dayStart(),
      ...(user.role === "HQ_ADMIN" ? {} : { branchId: user.branchId || undefined }),
    },
    include: { user: true, branch: true },
  });

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">People</p>
          <h1>Staff & attendance</h1>
          <p className="muted">Check-in, manager PIN, cashier sales performance.</p>
        </div>
      </header>
      <StaffClient
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          branch: u.branch,
          managerPinHash: Boolean(u.managerPinHash),
          performance: perf.get(u.id) || { count: 0, total: 0 },
        }))}
        attendance={attendance}
        canSetPin={user.role !== "CASHIER"}
      />
    </ErpPage>
  );
}

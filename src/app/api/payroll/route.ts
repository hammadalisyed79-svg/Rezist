import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, assertBranchAccess } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "payroll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const branchId =
    session.role === "HQ_ADMIN"
      ? req.nextUrl.searchParams.get("branchId")
      : session.branchId;

  const stubs = await prisma.payrollStub.findMany({
    where: branchId ? { branchId } : undefined,
    include: { user: true, branch: true },
    orderBy: { periodEnd: "desc" },
    take: 100,
  });

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const lines = [
      "staff,email,branch,periodStart,periodEnd,daysPresent,basePay,allowances,deductions,net,status",
      ...stubs.map((s) => {
        const net = s.basePay + s.allowances - s.deductions;
        return [
          s.user.name,
          s.user.email,
          s.branch.name,
          s.periodStart.toISOString().slice(0, 10),
          s.periodEnd.toISOString().slice(0, 10),
          s.daysPresent,
          s.basePay,
          s.allowances,
          s.deductions,
          net,
          s.status,
        ]
          .map((v) => String(v).replace(/,/g, " "))
          .join(",");
      }),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="rezist-payroll-stubs.csv"',
      },
    });
  }

  return NextResponse.json({ stubs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "payroll")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const action = String(body.action || "generate");

  if (action === "export") {
    const stub = await prisma.payrollStub.update({
      where: { id: String(body.id) },
      data: { status: "EXPORTED" },
    });
    await writeAudit({
      actor: session,
      action: "PAYROLL_EXPORT",
      entityType: "PayrollStub",
      entityId: stub.id,
      branchId: stub.branchId,
      summary: `Marked payroll stub exported`,
    });
    return NextResponse.json({ stub });
  }

  const branchId = String(body.branchId || session.branchId || "");
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
  try {
    assertBranchAccess(session, branchId);
  } catch {
    return NextResponse.json({ error: "Forbidden branch" }, { status: 403 });
  }

  const periodStart = new Date(String(body.periodStart));
  const periodEnd = new Date(String(body.periodEnd));
  periodEnd.setHours(23, 59, 59, 999);
  const dailyRate = Number(body.dailyRate || 2500);

  const staff = await prisma.user.findMany({
    where: {
      active: true,
      branchId,
      role: { in: ["BRANCH_MANAGER", "CASHIER"] },
    },
  });

  let created = 0;
  for (const u of staff) {
    const attendance = await prisma.attendance.findMany({
      where: {
        userId: u.id,
        branchId,
        workDate: { gte: periodStart, lte: periodEnd },
        status: { in: ["PRESENT", "LATE"] },
      },
    });
    const daysPresent = attendance.length || 0;
    if (daysPresent === 0) continue;

    await prisma.payrollStub.create({
      data: {
        userId: u.id,
        branchId,
        periodStart,
        periodEnd,
        daysPresent,
        basePay: daysPresent * dailyRate,
        allowances: 0,
        deductions: 0,
        status: "DRAFT",
        notes: `Auto from attendance · ${dailyRate}/day`,
      },
    });
    created += 1;
  }

  await writeAudit({
    actor: session,
    action: "PAYROLL_GENERATE",
    entityType: "PayrollStub",
    branchId,
    summary: `Generated ${created} payroll stubs`,
  });

  return NextResponse.json({ created });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";

function csvEscape(v: string | number) {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "accounting")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dateStr = req.nextUrl.searchParams.get("date");
  const branchIdParam = req.nextUrl.searchParams.get("branchId");
  const day = dateStr ? new Date(dateStr) : new Date();
  day.setHours(0, 0, 0, 0);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);

  const branchId =
    session.role === "HQ_ADMIN" ? branchIdParam || undefined : session.branchId || undefined;

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: { gte: day, lt: next },
      ...(branchId ? { branchId } : {}),
    },
    include: { branch: true, cashier: true, lines: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });

  const format = req.nextUrl.searchParams.get("format") || "json";
  const active = sales.filter((s) => !s.voided);
  const voided = sales.filter((s) => s.voided);
  const byPay = new Map<string, number>();
  for (const s of active) {
    byPay.set(s.paymentMethod, (byPay.get(s.paymentMethod) || 0) + s.total);
  }

  const summary = {
    businessDate: day.toISOString().slice(0, 10),
    saleCount: active.length,
    voidCount: voided.length,
    grossSales: active.reduce((a, s) => a + s.total, 0),
    taxTotal: active.reduce((a, s) => a + s.tax, 0),
    byPayment: Object.fromEntries(byPay),
  };

  if (format === "csv") {
    const lines = [
      ["saleNo", "branch", "cashier", "channel", "payment", "subtotal", "tax", "total", "voided", "createdAt"].join(","),
      ...sales.map((s) =>
        [
          s.saleNo,
          s.branch.name,
          s.cashier?.name || "",
          s.channel,
          s.paymentMethod,
          s.subtotal,
          s.tax,
          s.total,
          s.voided ? "YES" : "NO",
          s.createdAt.toISOString(),
        ]
          .map(csvEscape)
          .join(",")
      ),
      "",
      "SUMMARY",
      `businessDate,${summary.businessDate}`,
      `saleCount,${summary.saleCount}`,
      `voidCount,${summary.voidCount}`,
      `grossSales,${summary.grossSales}`,
      `taxTotal,${summary.taxTotal}`,
      ...Object.entries(summary.byPayment).map(([k, v]) => `pay_${k},${v}`),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="z-report-${summary.businessDate}.csv"`,
      },
    });
  }

  return NextResponse.json({ summary, sales: sales.slice(0, 200) });
}

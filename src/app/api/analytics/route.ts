import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { analyticsToCsv, buildAnalytics } from "@/lib/analytics";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "analytics")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const days = Number(req.nextUrl.searchParams.get("days") || 14);
  const branchId =
    session.role === "HQ_ADMIN"
      ? req.nextUrl.searchParams.get("branchId")
      : session.branchId;

  const data = await buildAnalytics({ days, branchId });

  if (req.nextUrl.searchParams.get("format") === "csv") {
    return new NextResponse(analyticsToCsv(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rezist-analytics-${days}d.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}

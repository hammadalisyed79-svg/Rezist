import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getProductCosting, syncFinishedCostsFromRecipes } from "@/lib/costing";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "costing")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await getProductCosting();
  return NextResponse.json({ rows, lowMarginCount: rows.filter((r) => r.lowMargin).length });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "HQ_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (body.action === "syncCosts") {
    const updated = await syncFinishedCostsFromRecipes();
    await writeAudit({
      actor: session,
      action: "COST_SYNC",
      entityType: "Product",
      summary: `Synced recipe costs on ${updated} products`,
    });
    return NextResponse.json({ updated });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

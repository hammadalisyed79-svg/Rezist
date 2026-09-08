import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { buildReorderSuggestions } from "@/lib/reorder";
import { prisma } from "@/lib/prisma";
import { nextDocNo } from "@/lib/utils";
import { adjustStock } from "@/lib/inventory";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "inventory")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const suggestions = await buildReorderSuggestions();
  const scoped =
    session.role === "HQ_ADMIN"
      ? suggestions
      : suggestions.filter((s) => s.branchId === session.branchId);
  return NextResponse.json({ suggestions: scoped });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "transfers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (body.action !== "createTransfer") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const fromBranchId = String(body.fromBranchId || "");
  const toBranchId = String(body.toBranchId || "");
  const productId = String(body.productId || "");
  const quantity = Number(body.quantity || 0);
  if (!fromBranchId || !toBranchId || !productId || quantity <= 0) {
    return NextResponse.json({ error: "Invalid transfer suggestion" }, { status: 400 });
  }

  try {
    await adjustStock(fromBranchId, productId, -quantity);
    const count = await prisma.stockTransfer.count();
    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNo: nextDocNo("TR", count + 1),
        fromBranchId,
        toBranchId,
        status: "IN_TRANSIT",
        notes: "Auto from reorder suggestion",
        createdById: session.id,
        shippedById: session.id,
        shippedAt: new Date(),
        lines: {
          create: [{ productId, quantity, shippedQty: quantity }],
        },
      },
    });

    await writeAudit({
      actor: session,
      action: "REORDER_TRANSFER",
      entityType: "StockTransfer",
      entityId: transfer.id,
      branchId: fromBranchId,
      summary: `Reorder transfer ${transfer.transferNo}`,
    });

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 }
    );
  }
}

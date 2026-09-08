import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { buildReorderSuggestions } from "@/lib/reorder";
import { prisma } from "@/lib/prisma";
import { nextDocNo } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "reorder")) {
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
  if (!session || !can(session.role, "reorder")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (body.action === "createPO") {
    if (!can(session.role, "purchases")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const branchId = String(body.branchId || "");
    const productId = String(body.productId || "");
    const quantity = Number(body.quantity || 0);
    if (!branchId || !productId || quantity <= 0) {
      return NextResponse.json({ error: "Invalid PO suggestion" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    let supplier = await prisma.supplier.findFirst({ where: { active: true }, orderBy: { name: "asc" } });
    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: { code: "SUP-AUTO", name: "Auto supplier (reorder)" },
      });
    }

    const unitCost = product.costPrice || 0;
    const count = await prisma.purchaseOrder.count();
    const po = await prisma.purchaseOrder.create({
      data: {
        poNo: nextDocNo("PO", count + 1),
        supplierId: supplier.id,
        branchId,
        status: "ORDERED",
        notes: `Auto from reorder · ${product.name}`,
        subtotal: unitCost * quantity,
        total: unitCost * quantity,
        createdById: session.id,
        lines: {
          create: [
            {
              productId,
              quantity,
              unitCost,
              lineTotal: unitCost * quantity,
            },
          ],
        },
      },
      include: { lines: true, supplier: true },
    });

    await writeAudit({
      actor: session,
      action: "REORDER_PO",
      entityType: "PurchaseOrder",
      entityId: po.id,
      branchId,
      summary: `Reorder PO ${po.poNo}`,
    });

    return NextResponse.json({ purchase: po }, { status: 201 });
  }

  if (body.action !== "createTransfer") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (!can(session.role, "transfers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fromBranchId = String(body.fromBranchId || "");
  const toBranchId = String(body.toBranchId || "");
  const productId = String(body.productId || "");
  const quantity = Number(body.quantity || 0);
  if (!fromBranchId || !toBranchId || !productId || quantity <= 0) {
    return NextResponse.json({ error: "Invalid transfer suggestion" }, { status: 400 });
  }

  try {
    const count = await prisma.stockTransfer.count();
    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNo: nextDocNo("TR", count + 1),
        fromBranchId,
        toBranchId,
        status: "DRAFT",
        notes: "Auto from reorder suggestion — ship when ready",
        createdById: session.id,
        lines: {
          create: [{ productId, quantity }],
        },
      },
    });

    await writeAudit({
      actor: session,
      action: "REORDER_TRANSFER",
      entityType: "StockTransfer",
      entityId: transfer.id,
      branchId: fromBranchId,
      summary: `Reorder draft transfer ${transfer.transferNo}`,
    });

    return NextResponse.json({ transfer }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 }
    );
  }
}

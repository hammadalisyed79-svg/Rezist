import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveBranchScope } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { adjustStock, syncInventoryFromLots } from "@/lib/inventory";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "inventory")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = resolveBranchScope(session, req.nextUrl.searchParams.get("branchId"));
  if (!branchId) {
    if (session.role === "HQ_ADMIN") {
      const items = await prisma.inventoryItem.findMany({
        include: { product: true, branch: true },
        orderBy: [{ branch: { name: "asc" } }, { product: { name: "asc" } }],
      });
      return NextResponse.json({ items });
    }
    return NextResponse.json({ error: "branchId required" }, { status: 400 });
  }

  const items = await prisma.inventoryItem.findMany({
    where: { branchId },
    include: { product: true, branch: true },
    orderBy: { product: { name: "asc" } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "adjustStock")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const branchId = resolveBranchScope(session, body.branchId);
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });

  const productId = String(body.productId);
  const quantity = Number(body.quantity || 0);
  const prev = await prisma.inventoryItem.findUnique({
    where: { branchId_productId: { branchId, productId } },
  });
  const previous = prev?.quantity ?? 0;
  const delta = quantity - previous;

  try {
    if (delta !== 0) {
      await adjustStock(branchId, productId, delta, true);
    } else {
      await syncInventoryFromLots(branchId, productId);
    }

    if (body.reorderLevel !== undefined) {
      await prisma.inventoryItem.upsert({
        where: { branchId_productId: { branchId, productId } },
        create: {
          branchId,
          productId,
          quantity,
          reorderLevel: Number(body.reorderLevel || 0),
        },
        update: { reorderLevel: Number(body.reorderLevel || 0) },
      });
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { branchId_productId: { branchId, productId } },
      include: { product: true },
    });

    await writeAudit({
      actor: session,
      action: "STOCK_ADJUST",
      entityType: "InventoryItem",
      entityId: item?.id,
      branchId,
      summary: `Set ${item?.product.name || productId} stock ${previous} → ${quantity} (lots synced)`,
      meta: { previous, next: quantity, delta },
    });

    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Adjust failed" },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextDocNo } from "@/lib/utils";
import { receiveStock } from "@/lib/inventory";
import { writeAudit } from "@/lib/audit";
import { can } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "purchases")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [suppliers, purchases] = await Promise.all([
    prisma.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.purchaseOrder.findMany({
      where:
        session.role === "HQ_ADMIN"
          ? undefined
          : { branchId: session.branchId || undefined },
      include: {
        supplier: true,
        branch: true,
        lines: { include: { product: true } },
      },
      orderBy: { orderedAt: "desc" },
      take: 60,
    }),
  ]);

  return NextResponse.json({ suppliers, purchases });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "purchases")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const action = String(body.action || "create");

  try {
    if (action === "createSupplier") {
      if (session.role !== "HQ_ADMIN") {
        return NextResponse.json({ error: "Only HQ can add suppliers" }, { status: 403 });
      }
      const count = await prisma.supplier.count();
      const supplier = await prisma.supplier.create({
        data: {
          code: String(body.code || `SUP-${count + 1}`).toUpperCase(),
          name: String(body.name),
          phone: body.phone || null,
          email: body.email || null,
          address: body.address || null,
          city: body.city || null,
          notes: body.notes || null,
        },
      });
      await writeAudit({
        actor: session,
        action: "SUPPLIER_CREATE",
        entityType: "Supplier",
        entityId: supplier.id,
        summary: `Created supplier ${supplier.name}`,
      });
      return NextResponse.json({ supplier }, { status: 201 });
    }

    if (action === "receive") {
      const purchase = await prisma.purchaseOrder.findUnique({
        where: { id: String(body.purchaseId) },
        include: { lines: { include: { product: true } } },
      });
      if (!purchase || !["ORDERED", "PARTIAL"].includes(purchase.status)) {
        return NextResponse.json({ error: "PO not receivable" }, { status: 400 });
      }
      if (session.role !== "HQ_ADMIN" && session.branchId !== purchase.branchId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const lineOverrides: { lineId: string; receivedQty: number }[] = body.lines || [];

      await prisma.$transaction(async () => {
        let allReceived = true;
        for (const line of purchase.lines) {
          const override = lineOverrides.find((l) => l.lineId === line.id);
          const addQty = override
            ? Number(override.receivedQty)
            : Math.max(0, line.quantity - line.receivedQty);
          if (addQty <= 0) {
            if (line.receivedQty + 0.0001 < line.quantity) allReceived = false;
            continue;
          }
          const nextRecv = line.receivedQty + addQty;
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + Number(body.expiryDays || 90));
          await receiveStock({
            branchId: purchase.branchId,
            productId: line.productId,
            quantity: addQty,
            expiryDate: expiry,
            sourceType: "PURCHASE",
            sourceId: purchase.id,
          });
          await prisma.purchaseOrderLine.update({
            where: { id: line.id },
            data: { receivedQty: nextRecv },
          });
          // refresh cost if provided
          if (line.unitCost > 0) {
            await prisma.product.update({
              where: { id: line.productId },
              data: { costPrice: line.unitCost },
            });
          }
          if (nextRecv + 0.0001 < line.quantity) allReceived = false;
        }
        await prisma.purchaseOrder.update({
          where: { id: purchase.id },
          data: {
            status: allReceived ? "RECEIVED" : "PARTIAL",
            receivedAt: allReceived ? new Date() : purchase.receivedAt,
            receivedById: session.id,
          },
        });
      });

      await writeAudit({
        actor: session,
        action: "PO_RECEIVE",
        entityType: "PurchaseOrder",
        entityId: purchase.id,
        branchId: purchase.branchId,
        summary: `GRN against ${purchase.poNo}`,
      });

      return NextResponse.json({ ok: true });
    }

    // create PO
    const supplierId = String(body.supplierId);
    const branchId = String(body.branchId);
    const lines: { productId: string; quantity: number; unitCost: number }[] = body.lines || [];
    if (!supplierId || !branchId || !lines.length) {
      return NextResponse.json({ error: "Supplier, branch and lines required" }, { status: 400 });
    }
    if (session.role !== "HQ_ADMIN" && session.branchId !== branchId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const mapped = lines.map((l) => {
      const qty = Number(l.quantity);
      const unitCost = Number(l.unitCost || 0);
      return {
        productId: l.productId,
        quantity: qty,
        unitCost,
        lineTotal: qty * unitCost,
      };
    });
    const subtotal = mapped.reduce((a, l) => a + l.lineTotal, 0);
    const count = await prisma.purchaseOrder.count();

    const purchase = await prisma.purchaseOrder.create({
      data: {
        poNo: nextDocNo("PO", count + 1),
        supplierId,
        branchId,
        status: "ORDERED",
        notes: body.notes || null,
        subtotal,
        total: subtotal,
        createdById: session.id,
        lines: { create: mapped },
      },
      include: {
        supplier: true,
        branch: true,
        lines: { include: { product: true } },
      },
    });

    await writeAudit({
      actor: session,
      action: "PO_CREATE",
      entityType: "PurchaseOrder",
      entityId: purchase.id,
      branchId,
      summary: `Created ${purchase.poNo}`,
    });

    return NextResponse.json({ purchase }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Purchase failed" },
      { status: 400 }
    );
  }
}

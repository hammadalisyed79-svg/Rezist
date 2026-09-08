import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { nextDocNo, resolveBranchScope } from "@/lib/utils";
import { getBranchPrice } from "@/lib/inventory";
import { upsertCustomerFromOrder } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "delivery")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const branchId = resolveBranchScope(session, req.nextUrl.searchParams.get("branchId"));
  const [riders, orders] = await Promise.all([
    prisma.deliveryRider.findMany({
      where: {
        active: true,
        ...(session.role === "HQ_ADMIN"
          ? branchId
            ? { OR: [{ branchId }, { branchId: null }] }
            : {}
          : { OR: [{ branchId: session.branchId || "" }, { branchId: null }] }),
      },
      include: { branch: true },
      orderBy: { name: "asc" },
    }),
    prisma.onlineOrder.findMany({
      where: {
        fulfillment: "DELIVERY",
        status: { in: ["READY", "PREPARING", "CONFIRMED", "COMPLETED"] },
        ...(branchId ? { branchId } : session.role === "HQ_ADMIN" ? {} : { branchId: session.branchId || "" }),
      },
      include: { branch: true, rider: true, lines: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);
  return NextResponse.json({ riders, orders });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "delivery")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "createRider") {
    if (!can(session.role, "staff") && session.role !== "HQ_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const rider = await prisma.deliveryRider.create({
      data: {
        name: String(body.name),
        phone: String(body.phone),
        vehicle: body.vehicle || null,
        branchId: body.branchId || session.branchId || null,
      },
    });
    return NextResponse.json({ rider }, { status: 201 });
  }

  if (action === "assign") {
    const order = await prisma.onlineOrder.update({
      where: { id: String(body.orderId) },
      data: {
        riderId: String(body.riderId),
        deliveryStatus: "ASSIGNED",
        status: "READY",
      },
      include: { rider: true },
    });
    await writeAudit({
      actor: session,
      action: "DELIVERY_ASSIGN",
      entityType: "OnlineOrder",
      entityId: order.id,
      branchId: order.branchId,
      summary: `Assigned ${order.orderNo} to ${order.rider?.name}`,
    });
    return NextResponse.json({ order });
  }

  if (action === "dispatch") {
    const order = await prisma.onlineOrder.update({
      where: { id: String(body.orderId) },
      data: { deliveryStatus: "OUT_FOR_DELIVERY", dispatchedAt: new Date() },
      include: { rider: true },
    });
    await writeAudit({
      actor: session,
      action: "DELIVERY_DISPATCH",
      entityType: "OnlineOrder",
      entityId: order.id,
      branchId: order.branchId,
      summary: `Out for delivery ${order.orderNo}`,
    });
    return NextResponse.json({ order });
  }

  if (action === "delivered") {
    const order = await prisma.onlineOrder.update({
      where: { id: String(body.orderId) },
      data: {
        deliveryStatus: "DELIVERED",
        deliveredAt: new Date(),
        status: "COMPLETED",
      },
    });
    return NextResponse.json({ order });
  }

  if (action === "importMarketplace") {
    try {
      const channel = String(body.channel || "FOODPANDA").toUpperCase();
      const branchId = resolveBranchScope(session, body.branchId);
      if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
      const externalRef = String(body.externalRef || "");
      if (!externalRef) return NextResponse.json({ error: "externalRef required" }, { status: 400 });

      const existing = await prisma.onlineOrder.findFirst({
        where: { externalChannel: channel, externalRef },
      });
      if (existing) {
        return NextResponse.json({ order: existing, duplicate: true });
      }

      const linesIn: { sku?: string; productId?: string; quantity: number; unitPrice?: number }[] =
        body.lines || [];
      if (!linesIn.length) return NextResponse.json({ error: "lines required" }, { status: 400 });

      const lines = [];
      let subtotal = 0;
      for (const l of linesIn) {
        const product = l.productId
          ? await prisma.product.findUnique({ where: { id: l.productId } })
          : await prisma.product.findFirst({ where: { sku: String(l.sku) } });
        if (!product) {
          return NextResponse.json(
            { error: `Unknown product ${l.sku || l.productId}` },
            { status: 400 }
          );
        }
        const qty = Number(l.quantity);
        const unitPrice =
          l.unitPrice != null
            ? Number(l.unitPrice)
            : await getBranchPrice(branchId, product.id, product.listPrice);
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        lines.push({ productId: product.id, quantity: qty, unitPrice, lineTotal });
      }

      const count = await prisma.onlineOrder.count();
      const order = await prisma.onlineOrder.create({
        data: {
          orderNo: nextDocNo(channel.slice(0, 3), count + 1),
          branchId,
          customerName: String(body.customerName || `${channel} guest`),
          customerPhone: String(body.customerPhone || "03000000000"),
          fulfillment: "DELIVERY",
          address: body.address || null,
          status: "PENDING",
          subtotal,
          total: subtotal,
          notes: body.notes || `Imported from ${channel}`,
          externalChannel: channel,
          externalRef,
          lines: { create: lines },
        },
        include: { lines: true },
      });

      await upsertCustomerFromOrder({
        name: order.customerName,
        phone: order.customerPhone,
        branchId,
        orderTotal: order.total,
      }).catch(() => null);

      await writeAudit({
        actor: session,
        action: "MARKETPLACE_IMPORT",
        entityType: "OnlineOrder",
        entityId: order.id,
        branchId,
        summary: `Imported ${channel} ${externalRef} → ${order.orderNo}`,
      });

      return NextResponse.json({ order }, { status: 201 });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Import failed" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

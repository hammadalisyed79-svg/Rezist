import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock, getBranchPrice } from "@/lib/inventory";
import { nextDocNo } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";
import { ORDER_FLOW, can, whatsappOrderLink } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const branchId = req.nextUrl.searchParams.get("branchId");
  const status = req.nextUrl.searchParams.get("status");

  if (!session || !can(session.role, "orders")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await prisma.onlineOrder.findMany({
    where: {
      ...(session.role === "HQ_ADMIN" ? {} : { branchId: session.branchId || undefined }),
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
    },
    include: { lines: { include: { product: true } }, branch: true },
    orderBy: { createdAt: "desc" },
    take: 120,
  });
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action || "create";

  if (action === "updateStatus") {
    const session = await getSession();
    if (!session || !can(session.role, "orders")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.onlineOrder.findUnique({
      where: { id: String(body.orderId) },
      include: { lines: { include: { product: true } }, branch: true },
    });
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (session.role !== "HQ_ADMIN" && session.branchId !== order.branchId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let status = String(body.status);
    // normalize legacy Accept → Confirmed
    if (status === "ACCEPTED") status = "CONFIRMED";

    const allowed = ORDER_FLOW[order.status] || [];
    if (!allowed.includes(status) && !(order.status === "ACCEPTED" && status === "CONFIRMED")) {
      // allow direct jump CONFIRM from PENDING already in flow
      if (!(order.status === "PENDING" && status === "CONFIRMED")) {
        // still allow PREPARING from ACCEPTED legacy
        if (!(order.status === "ACCEPTED" && ["PREPARING", "READY"].includes(status))) {
          return NextResponse.json(
            { error: `Cannot move ${order.status} → ${status}` },
            { status: 400 }
          );
        }
      }
    }

    if (status === "COMPLETED" && !order.saleId) {
      const sale = await prisma.$transaction(async () => {
        for (const line of order.lines) {
          await adjustStock(order.branchId, line.productId, -line.quantity);
        }
        const count = await prisma.sale.count();
        const created = await prisma.sale.create({
          data: {
            saleNo: nextDocNo("WEB", count + 1),
            branchId: order.branchId,
            cashierId: session.id,
            channel: "ONLINE",
            subtotal: order.subtotal,
            tax: 0,
            total: order.total,
            paymentMethod: "ONLINE",
            lines: {
              create: order.lines.map((l) => ({
                productId: l.productId,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                lineTotal: l.lineTotal,
              })),
            },
          },
        });
        await prisma.onlineOrder.update({
          where: { id: order.id },
          data: { status: "COMPLETED", saleId: created.id },
        });
        return created;
      });

      await writeAudit({
        actor: session,
        action: "ORDER_COMPLETE",
        entityType: "OnlineOrder",
        entityId: order.id,
        branchId: order.branchId,
        summary: `Completed ${order.orderNo}`,
      });

      const wa = whatsappOrderLink(
        order.customerPhone,
        `Rezist: Your order ${order.orderNo} is completed. Thank you!`
      );
      return NextResponse.json({ ok: true, sale, whatsappUrl: wa });
    }

    if (status === "CANCELLED") {
      const updated = await prisma.onlineOrder.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      await writeAudit({
        actor: session,
        action: "ORDER_CANCEL",
        entityType: "OnlineOrder",
        entityId: order.id,
        branchId: order.branchId,
        summary: `Cancelled ${order.orderNo}`,
      });
      return NextResponse.json({ order: updated });
    }

    const updated = await prisma.onlineOrder.update({
      where: { id: order.id },
      data: { status },
    });

    await writeAudit({
      actor: session,
      action: "ORDER_STATUS",
      entityType: "OnlineOrder",
      entityId: order.id,
      branchId: order.branchId,
      summary: `${order.orderNo} → ${status}`,
    });

    const msgs: Record<string, string> = {
      CONFIRMED: `Rezist: Order ${order.orderNo} confirmed at ${order.branch.name}.`,
      PREPARING: `Rezist: Order ${order.orderNo} is being prepared.`,
      READY: `Rezist: Order ${order.orderNo} is READY for ${order.fulfillment === "DELIVERY" ? "delivery" : "pickup"}.`,
    };
    const whatsappUrl = msgs[status]
      ? whatsappOrderLink(order.customerPhone, msgs[status])
      : null;

    return NextResponse.json({ order: updated, whatsappUrl });
  }

  // Public create order
  const branchId = String(body.branchId || "");
  const items: { productId: string; quantity: number }[] = body.items || [];
  if (!branchId || !items.length) {
    return NextResponse.json({ error: "Branch and items required" }, { status: 400 });
  }
  if (!body.customerName || !body.customerPhone) {
    return NextResponse.json({ error: "Customer name and phone required" }, { status: 400 });
  }

  try {
    const lines = [];
    let subtotal = 0;
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.isPublic || !product.isSellable) throw new Error("Invalid product");
      const inv = await prisma.inventoryItem.findUnique({
        where: { branchId_productId: { branchId, productId: product.id } },
      });
      if (product.trackStock && (!inv || inv.quantity < item.quantity)) {
        throw new Error(`${product.name} is out of stock at this branch`);
      }
      const unitPrice = await getBranchPrice(branchId, product.id, product.listPrice);
      const qty = Number(item.quantity);
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      lines.push({
        productId: product.id,
        quantity: qty,
        unitPrice,
        lineTotal,
      });
    }

    const count = await prisma.onlineOrder.count();
    const order = await prisma.onlineOrder.create({
      data: {
        orderNo: nextDocNo("ORD", count + 1),
        branchId,
        customerName: String(body.customerName),
        customerPhone: String(body.customerPhone),
        customerEmail: body.customerEmail || null,
        fulfillment: body.fulfillment || "PICKUP",
        address: body.address || null,
        status: "PENDING",
        subtotal,
        total: subtotal,
        notes: body.notes || null,
        lines: { create: lines },
      },
      include: { lines: { include: { product: true } }, branch: true },
    });

    try {
      const { upsertCustomerFromOrder } = await import("@/lib/pricing");
      const customer = await upsertCustomerFromOrder({
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
        branchId,
        orderTotal: order.total,
      });
      await prisma.onlineOrder.update({
        where: { id: order.id },
        data: { customerId: customer.id },
      });
    } catch {
      /* CRM link best-effort */
    }

    await writeAudit({
      action: "ORDER_CREATE",
      entityType: "OnlineOrder",
      entityId: order.id,
      branchId,
      summary: `Online ${order.orderNo} from ${order.customerName}`,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Order failed" },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock, getBranchPrice } from "@/lib/inventory";
import { nextDocNo } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const branchId = req.nextUrl.searchParams.get("branchId");
  const status = req.nextUrl.searchParams.get("status");

  if (session) {
    const orders = await prisma.onlineOrder.findMany({
      where: {
        ...(session.role === "HQ_ADMIN"
          ? {}
          : { branchId: session.branchId || undefined }),
        ...(branchId ? { branchId } : {}),
        ...(status ? { status } : {}),
      },
      include: { lines: { include: { product: true } }, branch: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ orders });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action = body.action || "create";

  if (action === "updateStatus") {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const order = await prisma.onlineOrder.findUnique({
      where: { id: String(body.orderId) },
      include: { lines: true },
    });
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (session.role !== "HQ_ADMIN" && session.branchId !== order.branchId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status = String(body.status);

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
      return NextResponse.json({ ok: true, sale });
    }

    const updated = await prisma.onlineOrder.update({
      where: { id: order.id },
      data: { status },
    });
    return NextResponse.json({ order: updated });
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

    return NextResponse.json({ order }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Order failed" },
      { status: 400 }
    );
  }
}

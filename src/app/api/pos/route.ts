import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock, getBranchPrice } from "@/lib/inventory";
import { nextDocNo, resolveBranchScope } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";
import { can } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "pos")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = resolveBranchScope(session, req.nextUrl.searchParams.get("branchId"));
  const sales = await prisma.sale.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      voided: false,
    },
    include: { lines: { include: { product: true } }, branch: true, cashier: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ sales });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "pos")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.action === "void") {
    if (!can(session.role, "voidSale")) {
      return NextResponse.json({ error: "Manager/HQ required to void" }, { status: 403 });
    }
    const sale = await prisma.sale.findUnique({
      where: { id: String(body.saleId) },
      include: { lines: true },
    });
    if (!sale || sale.voided) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }
    if (session.role !== "HQ_ADMIN" && session.branchId !== sale.branchId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async () => {
      for (const line of sale.lines) {
        await adjustStock(sale.branchId, line.productId, line.quantity);
      }
      await prisma.sale.update({
        where: { id: sale.id },
        data: {
          voided: true,
          voidReason: String(body.reason || "Manager void"),
        },
      });
    });

    await writeAudit({
      actor: session,
      action: "SALE_VOID",
      entityType: "Sale",
      entityId: sale.id,
      branchId: sale.branchId,
      summary: `Voided ${sale.saleNo}`,
      meta: { reason: body.reason || "Manager void" },
    });

    return NextResponse.json({ ok: true });
  }

  const branchId = resolveBranchScope(session, body.branchId);
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
  if (session.role !== "HQ_ADMIN" && session.branchId && session.branchId !== branchId) {
    return NextResponse.json({ error: "Cannot sell for another branch" }, { status: 403 });
  }

  const items: { productId: string; quantity: number }[] = body.items || [];
  if (!items.length) return NextResponse.json({ error: "Cart empty" }, { status: 400 });

  try {
    const sale = await prisma.$transaction(async () => {
      const lines = [];
      let subtotal = 0;
      for (const item of items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product || !product.isSellable) throw new Error("Invalid product");
        const unitPrice = await getBranchPrice(branchId, product.id, product.listPrice);
        const qty = Number(item.quantity);
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        await adjustStock(branchId, product.id, -qty);
        lines.push({
          productId: product.id,
          quantity: qty,
          unitPrice,
          lineTotal,
        });
      }

      const count = await prisma.sale.count();
      return prisma.sale.create({
        data: {
          saleNo: nextDocNo("POS", count + 1),
          branchId,
          cashierId: session.id,
          channel: "POS",
          subtotal,
          tax: 0,
          total: subtotal,
          paymentMethod: body.paymentMethod || "CASH",
          lines: { create: lines },
        },
        include: { lines: { include: { product: true } } },
      });
    });

    await writeAudit({
      actor: session,
      action: "SALE_CREATE",
      entityType: "Sale",
      entityId: sale.id,
      branchId,
      summary: `POS ${sale.saleNo} · ${sale.total}`,
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sale failed" },
      { status: 400 }
    );
  }
}

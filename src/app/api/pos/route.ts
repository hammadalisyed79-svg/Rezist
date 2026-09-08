import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock, getBranchPrice } from "@/lib/inventory";
import { nextDocNo, resolveBranchScope } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branchId = resolveBranchScope(session, req.nextUrl.searchParams.get("branchId"));
  const sales = await prisma.sale.findMany({
    where: branchId ? { branchId } : undefined,
    include: { lines: { include: { product: true } }, branch: true, cashier: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ sales });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const branchId = resolveBranchScope(session, body.branchId);
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });

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

    return NextResponse.json({ sale }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sale failed" },
      { status: 400 }
    );
  }
}

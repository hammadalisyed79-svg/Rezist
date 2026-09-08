import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
    include: { lines: { include: { product: true } }, branch: true, cashier: true, shift: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ sales });
}

async function verifyManagerPin(sessionBranchId: string | null, pin: string) {
  const managers = await prisma.user.findMany({
    where: {
      active: true,
      role: { in: ["HQ_ADMIN", "BRANCH_MANAGER"] },
      managerPinHash: { not: null },
      ...(sessionBranchId
        ? { OR: [{ role: "HQ_ADMIN" }, { branchId: sessionBranchId }] }
        : {}),
    },
  });
  for (const m of managers) {
    if (m.managerPinHash && (await bcrypt.compare(pin, m.managerPinHash))) return m;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "pos")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.action === "void") {
    const pin = String(body.managerPin || "");
    const manager = await verifyManagerPin(session.branchId, pin);
    if (!manager && !can(session.role, "voidSale")) {
      return NextResponse.json({ error: "Manager PIN required to void" }, { status: 403 });
    }
    if (!manager && session.role === "CASHIER") {
      return NextResponse.json({ error: "Invalid manager PIN" }, { status: 403 });
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
          voidReason: String(body.reason || `Void by ${manager?.name || session.name}`),
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
      meta: { managerId: manager?.id, reason: body.reason },
    });

    return NextResponse.json({ ok: true });
  }

  const branchId = resolveBranchScope(session, body.branchId);
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
  if (session.role !== "HQ_ADMIN" && session.branchId && session.branchId !== branchId) {
    return NextResponse.json({ error: "Cannot sell for another branch" }, { status: 403 });
  }

  const shiftId = String(body.shiftId || "");
  const shift = shiftId
    ? await prisma.posShift.findUnique({ where: { id: shiftId } })
    : await prisma.posShift.findFirst({
        where: { branchId, cashierId: session.id, status: "OPEN" },
      });
  if (!shift || shift.status !== "OPEN" || shift.branchId !== branchId) {
    return NextResponse.json({ error: "Open a till shift before selling" }, { status: 400 });
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
          shiftId: shift.id,
          tillNo: shift.tillNo,
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
      summary: `POS ${sale.saleNo} · ${sale.tillNo} · ${sale.total}`,
    });

    return NextResponse.json({ sale }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sale failed" },
      { status: 400 }
    );
  }
}

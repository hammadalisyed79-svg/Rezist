import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock, getBranchPrice } from "@/lib/inventory";
import { nextDocNo, resolveBranchScope } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";
import { can } from "@/lib/permissions";
import { upsertCustomerFromOrder } from "@/lib/pricing";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "pos")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branchId = resolveBranchScope(session, req.nextUrl.searchParams.get("branchId"));
  const barcode = req.nextUrl.searchParams.get("barcode");
  if (barcode) {
    const product = await prisma.product.findFirst({
      where: {
        active: true,
        isSellable: true,
        OR: [{ barcode }, { sku: barcode }],
      },
      include: { category: true },
    });
    return NextResponse.json({ product });
  }

  const sales = await prisma.sale.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      voided: false,
    },
    include: {
      lines: { include: { product: true } },
      branch: true,
      cashier: true,
      shift: true,
      customer: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ sales });
}

async function verifyManagerPin(sessionBranchId: string | null, pin: string) {
  if (!pin) return null;
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
    if (!manager) {
      return NextResponse.json({ error: "Valid manager PIN required to void" }, { status: 403 });
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
          voidReason: String(body.reason || `Void authorized by ${manager.name}`),
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
      meta: { managerId: manager.id, reason: body.reason },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "syncOffline") {
    const queued: {
      clientKey: string;
      branchId: string;
      shiftId: string;
      paymentMethod?: string;
      customerPhone?: string;
      customerName?: string;
      items: { productId: string; quantity: number }[];
      createdAt?: string;
    }[] = body.sales || [];
    const results: { clientKey: string; ok: boolean; saleNo?: string; error?: string }[] = [];
    for (const q of queued) {
      try {
        const fakeReq = {
          ...body,
          action: undefined,
          branchId: q.branchId,
          shiftId: q.shiftId,
          paymentMethod: q.paymentMethod,
          customerPhone: q.customerPhone,
          customerName: q.customerName,
          items: q.items,
          offlineKey: q.clientKey,
        };
        const res = await createSale(session, fakeReq);
        results.push({ clientKey: q.clientKey, ok: true, saleNo: res.saleNo });
      } catch (e) {
        results.push({
          clientKey: q.clientKey,
          ok: false,
          error: e instanceof Error ? e.message : "Failed",
        });
      }
    }
    return NextResponse.json({ results });
  }

  try {
    const sale = await createSale(session, body);
    return NextResponse.json({ sale }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sale failed" },
      { status: 400 }
    );
  }
}

async function createSale(
  session: { id: string; name: string; role: string; branchId: string | null },
  body: Record<string, unknown>
) {
  const branchId = resolveBranchScope(
    session as never,
    typeof body.branchId === "string" ? body.branchId : null
  );
  if (!branchId) throw new Error("branchId required");
  if (session.role !== "HQ_ADMIN" && session.branchId && session.branchId !== branchId) {
    throw new Error("Cannot sell for another branch");
  }

  const shiftId = String(body.shiftId || "");
  const shift = shiftId
    ? await prisma.posShift.findUnique({ where: { id: shiftId } })
    : await prisma.posShift.findFirst({
        where: { branchId, cashierId: session.id, status: "OPEN" },
      });
  if (!shift || shift.status !== "OPEN" || shift.branchId !== branchId) {
    throw new Error("Open a till shift before selling");
  }

  const items: { productId: string; quantity: number }[] = (body.items as never) || [];
  if (!items.length) throw new Error("Cart empty");

  const offlineKey = body.offlineKey ? String(body.offlineKey) : null;
  if (offlineKey) {
    const existing = await prisma.sale.findFirst({
      where: { offlineKey },
      include: { lines: { include: { product: true } }, customer: true },
    });
    if (existing) return existing;
  }

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

    let customerId: string | null = null;
    const phone = body.customerPhone ? String(body.customerPhone).replace(/\s+/g, "") : "";
    if (phone) {
      const customer = await upsertCustomerFromOrder({
        name: String(body.customerName || "POS Guest"),
        phone,
        branchId,
        orderTotal: subtotal,
      });
      customerId = customer.id;
    }

    const count = await prisma.sale.count();
    return prisma.sale.create({
      data: {
        saleNo: nextDocNo("POS", count + 1),
        branchId,
        cashierId: session.id,
        shiftId: shift.id,
        tillNo: shift.tillNo,
        channel: offlineKey ? "POS_OFFLINE" : "POS",
        subtotal,
        tax: 0,
        total: subtotal,
        paymentMethod: String(body.paymentMethod || "CASH"),
        customerId,
        offlineKey,
        lines: { create: lines },
      },
      include: { lines: { include: { product: true } }, customer: true },
    });
  });

  if (sale.customerId) {
    // loyalty already applied via upsertCustomerFromOrder when phone present
  }

  await writeAudit({
    actor: session as never,
    action: "SALE_CREATE",
    entityType: "Sale",
    entityId: sale.id,
    branchId,
    summary: `POS ${sale.saleNo} · ${sale.tillNo} · ${sale.total}`,
  });

  return sale;
}

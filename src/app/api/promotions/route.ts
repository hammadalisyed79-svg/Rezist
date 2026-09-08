import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";
import { nextDocNo } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "promotions")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [promos, overrides] = await Promise.all([
    prisma.promotion.findMany({
      include: { branch: true, items: { include: { product: true } } },
      orderBy: { startsAt: "desc" },
      take: 80,
    }),
    prisma.priceOverride.findMany({
      include: { product: true, branch: true },
      take: 100,
      orderBy: { branch: { name: "asc" } },
    }),
  ]);
  return NextResponse.json({ promotions: promos, overrides });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "promotions")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const action = String(body.action || "create");

  if (action === "toggle") {
    const promo = await prisma.promotion.update({
      where: { id: String(body.id) },
      data: { active: Boolean(body.active) },
    });
    return NextResponse.json({ promotion: promo });
  }

  if (action === "setPriceOverride") {
    const branchId = String(body.branchId || "");
    const productId = String(body.productId || "");
    const price = Number(body.price);
    if (!branchId || !productId || Number.isNaN(price)) {
      return NextResponse.json({ error: "branchId, productId, price required" }, { status: 400 });
    }
    if (session.role !== "HQ_ADMIN" && session.branchId !== branchId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const override = await prisma.priceOverride.upsert({
      where: { branchId_productId: { branchId, productId } },
      create: { branchId, productId, price },
      update: { price },
      include: { product: true, branch: true },
    });
    await writeAudit({
      actor: session,
      action: "PRICE_OVERRIDE",
      entityType: "PriceOverride",
      entityId: override.id,
      branchId,
      summary: `Branch price ${override.product.name} → ${price}`,
    });
    return NextResponse.json({ override });
  }

  if (action === "clearPriceOverride") {
    await prisma.priceOverride.delete({
      where: {
        branchId_productId: {
          branchId: String(body.branchId),
          productId: String(body.productId),
        },
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (session.role !== "HQ_ADMIN" && body.branchId && body.branchId !== session.branchId) {
    return NextResponse.json({ error: "Can only create promos for your branch" }, { status: 403 });
  }
  if (session.role !== "HQ_ADMIN" && !body.branchId && !body.city) {
    body.branchId = session.branchId;
  }

  const count = await prisma.promotion.count();
  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  const endsAt = body.endsAt
    ? new Date(body.endsAt)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const promo = await prisma.promotion.create({
    data: {
      code: String(body.code || nextDocNo("PROMO", count + 1)),
      name: String(body.name),
      type: String(body.type || "PERCENT"),
      value: Number(body.value || 0),
      city: body.city || null,
      branchId: body.branchId || null,
      startsAt,
      endsAt,
      notes: body.notes || null,
      createdById: session.id,
      items: body.productId
        ? { create: [{ productId: String(body.productId) }] }
        : undefined,
    },
    include: { items: true, branch: true },
  });

  await writeAudit({
    actor: session,
    action: "PROMO_CREATE",
    entityType: "Promotion",
    entityId: promo.id,
    summary: `Created promo ${promo.code}`,
  });

  return NextResponse.json({ promotion: promo }, { status: 201 });
}

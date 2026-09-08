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
  const promos = await prisma.promotion.findMany({
    include: { branch: true, items: { include: { product: true } } },
    orderBy: { startsAt: "desc" },
    take: 80,
  });
  return NextResponse.json({ promotions: promos });
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

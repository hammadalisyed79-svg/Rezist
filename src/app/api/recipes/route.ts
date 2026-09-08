import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "costing")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });
  const items = await prisma.recipeItem.findMany({
    where: { productId },
    include: { ingredient: true },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "CASHIER" || !can(session.role, "costing")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const productId = String(body.productId);
  const lines: { ingredientId: string; quantity: number }[] = body.lines || [];

  await prisma.$transaction(async () => {
    await prisma.recipeItem.deleteMany({ where: { productId } });
    if (lines.length) {
      await prisma.recipeItem.createMany({
        data: lines
          .filter((l) => l.ingredientId && Number(l.quantity) > 0)
          .map((l) => ({
            productId,
            ingredientId: l.ingredientId,
            quantity: Number(l.quantity),
          })),
      });
    }
  });

  await writeAudit({
    actor: session,
    action: "RECIPE_UPDATE",
    entityType: "Product",
    entityId: productId,
    summary: `Updated BOM (${lines.length} ingredients)`,
  });

  const items = await prisma.recipeItem.findMany({
    where: { productId },
    include: { ingredient: true },
  });
  return NextResponse.json({ items });
}

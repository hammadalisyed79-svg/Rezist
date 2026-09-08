import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const publicOnly = req.nextUrl.searchParams.get("public") === "1";
  const sellable = req.nextUrl.searchParams.get("sellable") === "1";
  const type = req.nextUrl.searchParams.get("type");

  if (!publicOnly) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(publicOnly ? { isPublic: true, isSellable: true } : {}),
      ...(sellable ? { isSellable: true } : {}),
      ...(type ? { type } : {}),
    },
    include: { category: true },
    orderBy: [{ name: "asc" }],
  });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "CASHIER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const product = await prisma.product.create({
    data: {
      sku: String(body.sku).toUpperCase(),
      name: String(body.name),
      description: body.description || null,
      type: body.type || "FINISHED",
      categoryId: body.categoryId || null,
      uom: body.uom || "pcs",
      listPrice: Number(body.listPrice || 0),
      costPrice: Number(body.costPrice || 0),
      trackStock: body.trackStock !== false,
      isSellable: body.isSellable !== false,
      isPublic: body.isPublic !== false,
      allergens: body.allergens || null,
    },
  });
  return NextResponse.json({ product }, { status: 201 });
}

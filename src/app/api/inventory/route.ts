import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveBranchScope } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const branchId = resolveBranchScope(session, req.nextUrl.searchParams.get("branchId"));
  if (!branchId) {
    if (session.role === "HQ_ADMIN") {
      const items = await prisma.inventoryItem.findMany({
        include: { product: true, branch: true },
        orderBy: [{ branch: { name: "asc" } }, { product: { name: "asc" } }],
      });
      return NextResponse.json({ items });
    }
    return NextResponse.json({ error: "branchId required" }, { status: 400 });
  }

  const items = await prisma.inventoryItem.findMany({
    where: { branchId },
    include: { product: true, branch: true },
    orderBy: { product: { name: "asc" } },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "CASHIER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const branchId = resolveBranchScope(session, body.branchId);
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });

  const item = await prisma.inventoryItem.upsert({
    where: {
      branchId_productId: { branchId, productId: String(body.productId) },
    },
    create: {
      branchId,
      productId: String(body.productId),
      quantity: Number(body.quantity || 0),
      reorderLevel: Number(body.reorderLevel || 0),
    },
    update: {
      quantity: Number(body.quantity || 0),
      reorderLevel: Number(body.reorderLevel || 0),
    },
    include: { product: true },
  });
  return NextResponse.json({ item });
}

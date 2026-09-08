import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock } from "@/lib/inventory";
import { resolveBranchScope } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const branchId = resolveBranchScope(session, req.nextUrl.searchParams.get("branchId"));

  const records = await prisma.wastageRecord.findMany({
    where: branchId ? { branchId } : undefined,
    include: { product: true, branch: true, recordedBy: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const branchId = resolveBranchScope(session, body.branchId);
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });

  try {
    const record = await prisma.$transaction(async () => {
      await adjustStock(branchId, String(body.productId), -Number(body.quantity));
      return prisma.wastageRecord.create({
        data: {
          branchId,
          productId: String(body.productId),
          quantity: Number(body.quantity),
          reason: String(body.reason || "Expired / unsold"),
          recordedById: session.id,
        },
        include: { product: true, branch: true },
      });
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 }
    );
  }
}

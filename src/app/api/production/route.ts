import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock } from "@/lib/inventory";
import { nextDocNo, resolveBranchScope } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const branchId = resolveBranchScope(session, req.nextUrl.searchParams.get("branchId"));

  const batches = await prisma.productionBatch.findMany({
    where: branchId ? { branchId } : undefined,
    include: {
      branch: true,
      lines: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ batches });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "CASHIER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const action = body.action || "create";

  if (action === "complete") {
    const batch = await prisma.productionBatch.findUnique({
      where: { id: String(body.batchId) },
      include: { lines: { include: { product: { include: { recipeItems: true } } } } },
    });
    if (!batch || batch.status === "COMPLETED") {
      return NextResponse.json({ error: "Invalid batch" }, { status: 400 });
    }

    const actuals: { lineId: string; actualQty: number }[] = body.actuals || [];

    await prisma.$transaction(async () => {
      for (const line of batch.lines) {
        const actual =
          actuals.find((a) => a.lineId === line.id)?.actualQty ?? line.plannedQty;
        await prisma.productionLine.update({
          where: { id: line.id },
          data: { actualQty: actual },
        });

        for (const recipe of line.product.recipeItems) {
          await adjustStock(batch.branchId, recipe.ingredientId, -(recipe.quantity * actual), true);
        }
        await adjustStock(batch.branchId, line.productId, actual);
      }
      await prisma.productionBatch.update({
        where: { id: batch.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    });

    return NextResponse.json({ ok: true });
  }

  const branchId = resolveBranchScope(session, body.branchId);
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
  const lines: { productId: string; plannedQty: number }[] = body.lines || [];
  if (!lines.length) return NextResponse.json({ error: "No lines" }, { status: 400 });

  const count = await prisma.productionBatch.count();
  const batch = await prisma.productionBatch.create({
    data: {
      batchNo: nextDocNo("PRD", count + 1),
      branchId,
      status: "PLANNED",
      plannedDate: body.plannedDate ? new Date(body.plannedDate) : new Date(),
      notes: body.notes || null,
      createdById: session.id,
      lines: {
        create: lines.map((l) => ({
          productId: l.productId,
          plannedQty: Number(l.plannedQty),
        })),
      },
    },
    include: { lines: { include: { product: true } }, branch: true },
  });

  return NextResponse.json({ batch }, { status: 201 });
}

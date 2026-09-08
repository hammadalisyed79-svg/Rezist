import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock, issueStock } from "@/lib/inventory";
import { nextDocNo, resolveBranchScope } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";
import { can } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "production")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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

async function reserveIngredients(
  branchId: string,
  lines: { productId: string; plannedQty: number }[]
) {
  for (const line of lines) {
    const recipes = await prisma.recipeItem.findMany({
      where: { productId: line.productId },
      include: { ingredient: true },
    });
    for (const r of recipes) {
      const need = r.quantity * Number(line.plannedQty);
      const inv = await prisma.inventoryItem.findUnique({
        where: { branchId_productId: { branchId, productId: r.ingredientId } },
      });
      const available = (inv?.quantity || 0) - (inv?.reservedQty || 0);
      if (available + 0.0001 < need) {
        throw new Error(`Not enough ${r.ingredient.name} to reserve (need ${need}, avail ${available})`);
      }
      await prisma.inventoryItem.upsert({
        where: { branchId_productId: { branchId, productId: r.ingredientId } },
        create: { branchId, productId: r.ingredientId, quantity: 0, reservedQty: need },
        update: { reservedQty: { increment: need } },
      });
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "production")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const action = body.action || "create";

  try {
    if (action === "planFromDemand") {
      const kitchen =
        (await prisma.branch.findFirst({
          where: { id: body.branchId || undefined, type: "CENTRAL_KITCHEN", active: true },
        })) ||
        (await prisma.branch.findFirst({ where: { type: "CENTRAL_KITCHEN", active: true } }));
      if (!kitchen) return NextResponse.json({ error: "No central kitchen" }, { status: 400 });

      const days = Number(body.days || 7);
      const since = new Date();
      since.setDate(since.getDate() - days);

      const sales = await prisma.saleLine.findMany({
        where: {
          sale: {
            createdAt: { gte: since },
            voided: false,
            channel: { in: ["POS", "ONLINE"] },
            branch: { type: "RETAIL" },
          },
          product: { type: "FINISHED", active: true },
        },
        include: { product: true },
      });

      const demand = new Map<string, number>();
      for (const line of sales) {
        demand.set(line.productId, (demand.get(line.productId) || 0) + line.quantity);
      }

      const lines = [...demand.entries()]
        .map(([productId, qty]) => ({
          productId,
          plannedQty: Math.max(5, Math.ceil(qty / days) * Number(body.coverDays || 2)),
        }))
        .slice(0, 12);

      if (!lines.length) {
        return NextResponse.json({ error: "No recent demand to plan from" }, { status: 400 });
      }

      await reserveIngredients(kitchen.id, lines);
      const count = await prisma.productionBatch.count();
      const batch = await prisma.productionBatch.create({
        data: {
          batchNo: nextDocNo("PRD", count + 1),
          branchId: kitchen.id,
          status: "RESERVED",
          plannedDate: body.plannedDate ? new Date(body.plannedDate) : new Date(),
          notes: body.notes || `Auto plan from ${days}d demand`,
          createdById: session.id,
          lines: {
            create: lines.map((l) => ({
              productId: l.productId,
              plannedQty: l.plannedQty,
            })),
          },
        },
        include: { lines: { include: { product: true } }, branch: true },
      });

      await writeAudit({
        actor: session,
        action: "PRODUCTION_PLAN_DEMAND",
        entityType: "ProductionBatch",
        entityId: batch.id,
        branchId: kitchen.id,
        summary: `Demand plan ${batch.batchNo} (${lines.length} SKUs)`,
      });

      return NextResponse.json({ batch }, { status: 201 });
    }

    if (action === "complete") {
      const batch = await prisma.productionBatch.findUnique({
        where: { id: String(body.batchId) },
        include: { lines: { include: { product: { include: { recipeItems: true } } } } },
      });
      if (!batch || batch.status === "COMPLETED") {
        return NextResponse.json({ error: "Invalid batch" }, { status: 400 });
      }

      const actuals: { lineId: string; actualQty: number }[] = body.actuals || [];
      const alreadyReserved = batch.status === "RESERVED";

      await prisma.$transaction(async () => {
        for (const line of batch.lines) {
          const actual =
            actuals.find((a) => a.lineId === line.id)?.actualQty ?? line.plannedQty;
          await prisma.productionLine.update({
            where: { id: line.id },
            data: { actualQty: actual },
          });

          if (!alreadyReserved) {
            for (const recipe of line.product.recipeItems) {
              await issueStock(batch.branchId, recipe.ingredientId, recipe.quantity * actual, true);
            }
          } else {
            for (const recipe of line.product.recipeItems) {
              const reserved = recipe.quantity * line.plannedQty;
              const useQty = recipe.quantity * actual;
              await issueStock(batch.branchId, recipe.ingredientId, useQty, true);
              const inv = await prisma.inventoryItem.findUnique({
                where: {
                  branchId_productId: {
                    branchId: batch.branchId,
                    productId: recipe.ingredientId,
                  },
                },
              });
              if (inv) {
                await prisma.inventoryItem.update({
                  where: { id: inv.id },
                  data: { reservedQty: Math.max(0, (inv.reservedQty || 0) - reserved) },
                });
              }
            }
          }

          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 2); // cream desserts default 48h
          await adjustStock(batch.branchId, line.productId, actual);
          // tag latest lot with production expiry
          const lot = await prisma.inventoryLot.findFirst({
            where: { branchId: batch.branchId, productId: line.productId },
            orderBy: { receivedAt: "desc" },
          });
          if (lot) {
            await prisma.inventoryLot.update({
              where: { id: lot.id },
              data: {
                expiryDate: expiry,
                sourceType: "PRODUCTION",
                sourceId: batch.id,
              },
            });
          }
        }
        await prisma.productionBatch.update({
          where: { id: batch.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      });

      await writeAudit({
        actor: session,
        action: "PRODUCTION_COMPLETE",
        entityType: "ProductionBatch",
        entityId: batch.id,
        branchId: batch.branchId,
        summary: `Completed ${batch.batchNo}`,
      });

      return NextResponse.json({ ok: true });
    }

    const branchId = resolveBranchScope(session, body.branchId);
    if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
    const lines: { productId: string; plannedQty: number }[] = body.lines || [];
    if (!lines.length) return NextResponse.json({ error: "No lines" }, { status: 400 });

    const reserve = body.reserve !== false;
    if (reserve) await reserveIngredients(branchId, lines);

    const count = await prisma.productionBatch.count();
    const batch = await prisma.productionBatch.create({
      data: {
        batchNo: nextDocNo("PRD", count + 1),
        branchId,
        status: reserve ? "RESERVED" : "PLANNED",
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

    await writeAudit({
      actor: session,
      action: "PRODUCTION_CREATE",
      entityType: "ProductionBatch",
      entityId: batch.id,
      branchId,
      summary: `Created ${batch.batchNo} (${batch.status})`,
    });

    return NextResponse.json({ batch }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Production failed" },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock } from "@/lib/inventory";
import { nextDocNo } from "@/lib/utils";
import { writeAudit } from "@/lib/audit";
import { can } from "@/lib/permissions";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.role, "transfers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const transfers = await prisma.stockTransfer.findMany({
    where:
      session.role === "HQ_ADMIN"
        ? undefined
        : {
            OR: [{ fromBranchId: session.branchId || "" }, { toBranchId: session.branchId || "" }],
          },
    include: {
      fromBranch: true,
      toBranch: true,
      lines: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return NextResponse.json({ transfers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "transfers")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const action = String(body.action || "create");

  try {
    if (action === "ship") {
      const transferId = String(body.transferId);
      const transfer = await prisma.stockTransfer.findUnique({
        where: { id: transferId },
        include: { lines: true },
      });
      if (!transfer || transfer.status !== "DRAFT") {
        return NextResponse.json({ error: "Transfer not shippable" }, { status: 400 });
      }
      if (session.role !== "HQ_ADMIN" && session.branchId !== transfer.fromBranchId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const lineOverrides: { lineId: string; shippedQty: number }[] = body.lines || [];

      await prisma.$transaction(async () => {
        for (const line of transfer.lines) {
          const override = lineOverrides.find((l) => l.lineId === line.id);
          const shippedQty = override ? Number(override.shippedQty) : line.quantity;
          if (shippedQty <= 0) throw new Error("Shipped qty must be > 0");
          await adjustStock(transfer.fromBranchId, line.productId, -shippedQty);
          await prisma.stockTransferLine.update({
            where: { id: line.id },
            data: { shippedQty },
          });
        }
        await prisma.stockTransfer.update({
          where: { id: transfer.id },
          data: {
            status: "IN_TRANSIT",
            shippedAt: new Date(),
            shippedById: session.id,
          },
        });
      });

      await writeAudit({
        actor: session,
        action: "TRANSFER_SHIP",
        entityType: "StockTransfer",
        entityId: transfer.id,
        branchId: transfer.fromBranchId,
        summary: `Shipped ${transfer.transferNo}`,
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "receive") {
      const transferId = String(body.transferId);
      const transfer = await prisma.stockTransfer.findUnique({
        where: { id: transferId },
        include: { lines: { include: { product: true } } },
      });
      if (!transfer || transfer.status !== "IN_TRANSIT") {
        return NextResponse.json({ error: "Transfer not receivable" }, { status: 400 });
      }
      if (session.role !== "HQ_ADMIN" && session.branchId !== transfer.toBranchId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const lineOverrides: { lineId: string; receivedQty: number }[] = body.lines || [];
      const variances: { product: string; shipped: number; received: number }[] = [];

      await prisma.$transaction(async () => {
        for (const line of transfer.lines) {
          const override = lineOverrides.find((l) => l.lineId === line.id);
          const receivedQty = override ? Number(override.receivedQty) : line.shippedQty || line.quantity;
          if (receivedQty < 0) throw new Error("Received qty cannot be negative");
          await adjustStock(transfer.toBranchId, line.productId, receivedQty);
          await prisma.stockTransferLine.update({
            where: { id: line.id },
            data: { receivedQty },
          });
          const shipped = line.shippedQty || line.quantity;
          const short = shipped - receivedQty;
          if (Math.abs(short) > 0.0001) {
            variances.push({
              product: line.product.name,
              shipped,
              received: receivedQty,
            });
          }
          if (short > 0.0001) {
            await prisma.wastageRecord.create({
              data: {
                branchId: transfer.fromBranchId,
                productId: line.productId,
                quantity: short,
                reason: `Transfer variance ${transfer.transferNo} (ship ${shipped}/recv ${receivedQty})`,
                recordedById: session.id,
              },
            });
          }
        }
        await prisma.stockTransfer.update({
          where: { id: transfer.id },
          data: {
            status: "RECEIVED",
            receivedAt: new Date(),
            receivedById: session.id,
            notes: variances.length
              ? `${transfer.notes || ""}\nVariance: ${variances
                  .map((v) => `${v.product} ship ${v.shipped}/recv ${v.received}`)
                  .join("; ")}`.trim()
              : transfer.notes,
          },
        });
      });

      await writeAudit({
        actor: session,
        action: "TRANSFER_RECEIVE",
        entityType: "StockTransfer",
        entityId: transfer.id,
        branchId: transfer.toBranchId,
        summary: `Received ${transfer.transferNo}${variances.length ? " with variance" : ""}`,
        meta: { variances },
      });

      return NextResponse.json({ ok: true, variances });
    }

    if (action === "cancel") {
      const transfer = await prisma.stockTransfer.findUnique({ where: { id: String(body.transferId) } });
      if (!transfer || transfer.status !== "DRAFT") {
        return NextResponse.json({ error: "Only draft transfers can be cancelled" }, { status: 400 });
      }
      await prisma.stockTransfer.update({
        where: { id: transfer.id },
        data: { status: "CANCELLED" },
      });
      await writeAudit({
        actor: session,
        action: "TRANSFER_CANCEL",
        entityType: "StockTransfer",
        entityId: transfer.id,
        summary: `Cancelled ${transfer.transferNo}`,
      });
      return NextResponse.json({ ok: true });
    }

    // create draft (no stock movement until ship)
    const fromBranchId = String(body.fromBranchId);
    const toBranchId = String(body.toBranchId);
    const lines: { productId: string; quantity: number }[] = body.lines || [];
    if (!lines.length) return NextResponse.json({ error: "No lines" }, { status: 400 });
    if (session.role !== "HQ_ADMIN" && session.branchId !== fromBranchId) {
      return NextResponse.json({ error: "Can only create transfers from your branch" }, { status: 403 });
    }

    const count = await prisma.stockTransfer.count();
    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNo: nextDocNo("TR", count + 1),
        fromBranchId,
        toBranchId,
        status: "DRAFT",
        notes: body.notes || null,
        createdById: session.id,
        lines: {
          create: lines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
          })),
        },
      },
      include: { lines: { include: { product: true } }, fromBranch: true, toBranch: true },
    });

    const autoShip = body.autoShip === true;
    if (autoShip) {
      await prisma.$transaction(async () => {
        for (const line of transfer.lines) {
          await adjustStock(fromBranchId, line.productId, -line.quantity);
          await prisma.stockTransferLine.update({
            where: { id: line.id },
            data: { shippedQty: line.quantity },
          });
        }
        await prisma.stockTransfer.update({
          where: { id: transfer.id },
          data: { status: "IN_TRANSIT", shippedAt: new Date(), shippedById: session.id },
        });
      });
      transfer.status = "IN_TRANSIT";
    }

    await writeAudit({
      actor: session,
      action: autoShip ? "TRANSFER_CREATE_SHIP" : "TRANSFER_CREATE",
      entityType: "StockTransfer",
      entityId: transfer.id,
      branchId: fromBranchId,
      summary: `${autoShip ? "Created & shipped" : "Drafted"} ${transfer.transferNo}`,
    });

    const fresh = await prisma.stockTransfer.findUnique({
      where: { id: transfer.id },
      include: { lines: { include: { product: true } }, fromBranch: true, toBranch: true },
    });

    return NextResponse.json({ transfer: fresh }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Transfer failed" },
      { status: 400 }
    );
  }
}

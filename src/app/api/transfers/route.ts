import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustStock } from "@/lib/inventory";
import { nextDocNo } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    take: 50,
  });
  return NextResponse.json({ transfers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "CASHIER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const fromBranchId = String(body.fromBranchId);
  const toBranchId = String(body.toBranchId);
  const lines: { productId: string; quantity: number }[] = body.lines || [];
  const action = body.action || "create";

  if (action === "receive") {
    const transferId = String(body.transferId);
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { lines: true },
    });
    if (!transfer || transfer.status !== "IN_TRANSIT") {
      return NextResponse.json({ error: "Transfer not receivable" }, { status: 400 });
    }
    if (session.role !== "HQ_ADMIN" && session.branchId !== transfer.toBranchId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async () => {
      for (const line of transfer.lines) {
        await adjustStock(transfer.toBranchId, line.productId, line.quantity);
      }
      await prisma.stockTransfer.update({
        where: { id: transfer.id },
        data: { status: "RECEIVED", receivedAt: new Date() },
      });
    });

    return NextResponse.json({ ok: true });
  }

  if (!lines.length) return NextResponse.json({ error: "No lines" }, { status: 400 });

  const count = await prisma.stockTransfer.count();
  const transfer = await prisma.$transaction(async () => {
    for (const line of lines) {
      await adjustStock(fromBranchId, line.productId, -Number(line.quantity));
    }
    return prisma.stockTransfer.create({
      data: {
        transferNo: nextDocNo("TR", count + 1),
        fromBranchId,
        toBranchId,
        status: "IN_TRANSIT",
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
  });

  return NextResponse.json({ transfer }, { status: 201 });
}

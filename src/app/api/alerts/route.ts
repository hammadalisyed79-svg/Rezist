import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { refreshOpsNotifications } from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session || !can(session.role, "alerts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const branchId = session.role === "HQ_ADMIN" ? undefined : session.branchId || undefined;
  const alerts = await prisma.opsNotification.findMany({
    where: branchId ? { OR: [{ branchId }, { branchId: null }] } : undefined,
    include: { branch: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ alerts });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "alerts")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const action = String(body.action || "read");

  if (action === "refresh") {
    const result = await refreshOpsNotifications();
    return NextResponse.json(result);
  }

  if (action === "readAll") {
    await prisma.opsNotification.updateMany({
      where: { readAt: null },
      data: { readAt: new Date(), readById: session.id },
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.opsNotification.update({
    where: { id: String(body.id) },
    data: { readAt: new Date(), readById: session.id },
  });
  return NextResponse.json({ ok: true });
}

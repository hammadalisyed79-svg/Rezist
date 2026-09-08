import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { upsertCustomerFromOrder } from "@/lib/pricing";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "crm")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { phone: { contains: q } },
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    include: {
      preferredBranch: true,
      loyaltyLedger: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { sales: true, orders: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "crm")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const action = String(body.action || "create");

  if (action === "adjustPoints") {
    if (session.role === "CASHIER") {
      return NextResponse.json({ error: "Manager required" }, { status: 403 });
    }
    const delta = Number(body.delta || 0);
    const customer = await prisma.customer.update({
      where: { id: String(body.customerId) },
      data: { loyaltyPoints: { increment: delta } },
    });
    await prisma.loyaltyLedger.create({
      data: {
        customerId: customer.id,
        delta,
        reason: String(body.reason || "Manual adjust"),
      },
    });
    return NextResponse.json({ customer });
  }

  if (action === "setBirthday") {
    const customer = await prisma.customer.update({
      where: { id: String(body.customerId) },
      data: { birthday: body.birthday ? new Date(String(body.birthday)) : null },
    });
    return NextResponse.json({ customer });
  }

  const customer = await upsertCustomerFromOrder({
    name: String(body.name),
    phone: String(body.phone),
    email: body.email,
    branchId: body.branchId || session.branchId || undefined,
  });

  if (body.birthday) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { birthday: new Date(String(body.birthday)) },
    });
  }

  await writeAudit({
    actor: session,
    action: "CUSTOMER_UPSERT",
    entityType: "Customer",
    entityId: customer.id,
    summary: `Customer ${customer.name} (${customer.phone})`,
  });

  return NextResponse.json({ customer }, { status: 201 });
}

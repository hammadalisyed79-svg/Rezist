import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const city = req.nextUrl.searchParams.get("city");
  const branches = await prisma.branch.findMany({
    where: {
      active: true,
      ...(city ? { city } : {}),
      ...(session.role !== "HQ_ADMIN" && session.branchId
        ? { OR: [{ id: session.branchId }, { type: { in: ["WAREHOUSE", "CENTRAL_KITCHEN"] } }] }
        : {}),
    },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ branches });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "HQ_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const branch = await prisma.branch.create({
    data: {
      code: String(body.code).toUpperCase(),
      name: String(body.name),
      city: String(body.city),
      address: String(body.address),
      phone: body.phone ? String(body.phone) : null,
      type: body.type || "RETAIL",
    },
  });
  return NextResponse.json({ branch }, { status: 201 });
}

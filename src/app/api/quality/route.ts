import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can, assertBranchAccess } from "@/lib/permissions";
import { writeAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "quality")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const branchId =
    session.role === "HQ_ADMIN"
      ? req.nextUrl.searchParams.get("branchId")
      : session.branchId;
  const checks = await prisma.qualityCheck.findMany({
    where: branchId ? { branchId } : undefined,
    include: { branch: true, checkedBy: true },
    orderBy: { checkedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ checks });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "quality")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const branchId = String(body.branchId || session.branchId || "");
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
  try {
    assertBranchAccess(session, branchId);
  } catch {
    return NextResponse.json({ error: "Forbidden branch" }, { status: 403 });
  }

  const check = await prisma.qualityCheck.create({
    data: {
      branchId,
      checkType: String(body.checkType || "TEMP"),
      title: String(body.title || "Check"),
      status: String(body.status || "PASS"),
      value: body.value != null && body.value !== "" ? Number(body.value) : null,
      unit: body.unit ? String(body.unit) : null,
      relatedLotId: body.relatedLotId ? String(body.relatedLotId) : null,
      notes: body.notes ? String(body.notes) : null,
      checkedById: session.id,
    },
    include: { branch: true },
  });

  await writeAudit({
    actor: session,
    action: "QUALITY_CHECK",
    entityType: "QualityCheck",
    entityId: check.id,
    branchId,
    summary: `${check.checkType} ${check.status}: ${check.title}`,
  });

  return NextResponse.json({ check }, { status: 201 });
}

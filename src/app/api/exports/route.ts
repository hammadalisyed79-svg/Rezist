import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { buildExportPack } from "@/lib/exports";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "exports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const type = String(req.nextUrl.searchParams.get("type") || "SALES").toUpperCase();
  const days = Number(req.nextUrl.searchParams.get("days") || 7);
  const pack = await buildExportPack(type, days);
  return new NextResponse(pack.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${pack.filename}"`,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !can(session.role, "exports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (body.action === "markRun" && body.id) {
    await prisma.reportPreset.update({
      where: { id: String(body.id) },
      data: { lastRunAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const branches = await prisma.branch.findMany({
    where: { active: true, type: "RETAIL" },
    orderBy: [{ city: "asc" }, { name: "asc" }],
  });
  const categories = await prisma.category.findMany({
    where: { slug: { not: "raw-materials" } },
    include: {
      products: {
        where: { active: true, isPublic: true, isSellable: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ branches, categories });
}

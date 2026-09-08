import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { ExportsClient } from "@/components/ExportsClient";

export default async function ExportsPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "exports")) redirect("/erp");

  const presets = await prisma.reportPreset.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 6</p>
          <h1>HQ export packs</h1>
          <p className="muted">
            Scheduled-style CSV presets for scoreboard, sales, wastage, suppliers, handovers.
          </p>
        </div>
      </header>
      <ExportsClient presets={presets} />
    </ErpPage>
  );
}

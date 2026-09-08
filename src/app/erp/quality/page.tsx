import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { QualityClient } from "@/components/QualityClient";

export default async function QualityPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "quality")) redirect("/erp");

  const branchId = user.role === "HQ_ADMIN" ? undefined : user.branchId || undefined;
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const [checks, branches, lots, fails] = await Promise.all([
    prisma.qualityCheck.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        checkedAt: { gte: since },
      },
      include: { branch: true, checkedBy: true },
      orderBy: { checkedAt: "desc" },
      take: 80,
    }),
    prisma.branch.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.inventoryLot.findMany({
      where: {
        quantity: { gt: 0 },
        ...(branchId ? { branchId } : {}),
      },
      include: { product: true, branch: true },
      orderBy: { expiryDate: "asc" },
      take: 40,
    }),
    prisma.qualityCheck.count({
      where: {
        status: "FAIL",
        ...(branchId ? { branchId } : {}),
        checkedAt: { gte: since },
      },
    }),
  ]);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Phase 5</p>
          <h1>Food safety &amp; quality</h1>
          <p className="muted">
            Temperature, cleaning, receiving checks · lot recall notes · company HACCP light.
          </p>
        </div>
      </header>
      <section className="stat-grid compact">
        <article>
          <span>Checks (14d)</span>
          <strong>{checks.length}</strong>
        </article>
        <article>
          <span>Fails</span>
          <strong>{fails}</strong>
        </article>
        <article>
          <span>Active lots</span>
          <strong>{lots.length}</strong>
        </article>
      </section>
      <QualityClient
        checks={checks}
        branches={branches}
        lots={lots.map((l) => ({
          id: l.id,
          label: `${l.lotNo} · ${l.product.name} · ${l.branch.name}`,
          branchId: l.branchId,
        }))}
        defaultBranchId={user.branchId || branches.find((b) => b.type === "RETAIL")?.id || ""}
      />
    </ErpPage>
  );
}

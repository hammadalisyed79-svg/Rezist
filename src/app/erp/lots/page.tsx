import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import Link from "next/link";

export default async function LotsPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const user = await requireErpUser();
  if (!can(user.role as Role, "lots")) redirect("/erp");
  const sp = await searchParams;
  const branches = await prisma.branch.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const branchId =
    user.role === "HQ_ADMIN" ? sp.branchId || branches[0]?.id : user.branchId || undefined;

  const lots = branchId
    ? await prisma.inventoryLot.findMany({
        where: { branchId, quantity: { gt: 0 } },
        include: { product: true, branch: true },
        orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }],
        take: 200,
      })
    : [];

  const soon = new Date();
  soon.setDate(soon.getDate() + 3);

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">FEFO</p>
          <h1>Inventory lots</h1>
          <p className="muted">Dated batches — sales and production issue earliest expiry first.</p>
        </div>
      </header>
      {user.role === "HQ_ADMIN" ? (
        <div className="toolbar">
          {branches.map((b) => (
            <Link
              key={b.id}
              className={b.id === branchId ? "chip active" : "chip"}
              href={`/erp/lots?branchId=${b.id}`}
            >
              {b.name}
            </Link>
          ))}
        </div>
      ) : null}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Lot</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Expiry</th>
              <th>Source</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((l) => {
              const expiring = l.expiryDate && l.expiryDate <= soon;
              return (
                <tr key={l.id} className={expiring ? "warn-row" : undefined}>
                  <td>{l.lotNo}</td>
                  <td>{l.product.name}</td>
                  <td>{l.quantity}</td>
                  <td>{l.expiryDate ? l.expiryDate.toLocaleDateString() : "—"}</td>
                  <td>
                    {l.sourceType || "—"}
                    {l.sourceId ? <small> · {l.sourceId.slice(0, 8)}</small> : null}
                  </td>
                  <td>
                    <small>{l.receivedAt.toLocaleString()}</small>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!lots.length ? <p className="muted">No open lots at this branch.</p> : null}
      </section>
    </ErpPage>
  );
}

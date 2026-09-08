import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

export default async function AuditPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "audit")) redirect("/erp");

  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Compliance</p>
          <h1>Audit log</h1>
          <p className="muted">Who changed stock, transfers, purchases, and orders.</p>
        </div>
      </header>
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>
                  <small>{l.createdAt.toLocaleString()}</small>
                </td>
                <td>{l.actor?.name || "System"}</td>
                <td>{l.action}</td>
                <td>
                  {l.entityType}
                  {l.entityId ? <small> · {l.entityId.slice(0, 8)}</small> : null}
                </td>
                <td>{l.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length ? <p className="muted">No audit events yet.</p> : null}
      </section>
    </ErpPage>
  );
}

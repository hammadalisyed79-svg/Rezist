import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { BranchCreateForm } from "@/components/BranchCreateForm";

export default async function BranchesPage() {
  const user = await requireErpUser();
  const branches = await prisma.branch.findMany({ orderBy: [{ city: "asc" }, { name: "asc" }] });

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Network</p>
          <h1>Branches across Pakistan</h1>
        </div>
      </header>
      {user.role === "HQ_ADMIN" ? <BranchCreateForm /> : null}
      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>City</th>
              <th>Type</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id}>
                <td>{b.code}</td>
                <td>{b.name}</td>
                <td>{b.city}</td>
                <td>{b.type}</td>
                <td>{b.address}</td>
                <td>{b.phone || "—"}</td>
                <td>{b.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </ErpPage>
  );
}

import { ErpPage, requireErpUser } from "@/lib/erp";
import { PosClient } from "@/components/PosClient";

export default async function PosPage() {
  const user = await requireErpUser();
  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Sales</p>
          <h1>Branch POS</h1>
        </div>
      </header>
      <PosClient initialBranchId={user.branchId} role={user.role} />
    </ErpPage>
  );
}

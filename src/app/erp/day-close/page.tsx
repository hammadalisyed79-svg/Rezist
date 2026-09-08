import { ErpPage, requireErpUser } from "@/lib/erp";
import { DayCloseClient } from "@/components/DayCloseClient";

export default async function DayClosePage() {
  const user = await requireErpUser();
  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">End of day</p>
          <h1>Day close</h1>
        </div>
      </header>
      <DayCloseClient branchId={user.branchId} role={user.role} />
    </ErpPage>
  );
}

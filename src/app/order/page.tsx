import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OrderClient } from "@/components/OrderClient";

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const sp = await searchParams;
  const [branches, products] = await Promise.all([
    prisma.branch.findMany({
      where: { active: true, type: "RETAIL" },
      orderBy: [{ city: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: { active: true, isPublic: true, isSellable: true },
      include: { category: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="site">
      <SiteHeader />
      <main className="section">
        <div className="section-head">
          <p className="eyebrow">Order</p>
          <h1>Pickup or delivery</h1>
          <p>Stock and pricing come from the live ERP for your chosen branch.</p>
        </div>
        <OrderClient
          branches={branches}
          products={products}
          initialBranchId={sp.branchId || branches[0]?.id}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

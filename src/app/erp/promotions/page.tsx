import { ErpPage, requireErpUser } from "@/lib/erp";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { PromoClient } from "@/components/PromoClient";

export default async function PromotionsPage() {
  const user = await requireErpUser();
  if (!can(user.role as Role, "promotions")) redirect("/erp");

  const [promotions, branches, products] = await Promise.all([
    prisma.promotion.findMany({
      include: { branch: true, items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.branch.findMany({ where: { active: true, type: "RETAIL" }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: { active: true, isSellable: true, type: "FINISHED" },
      orderBy: { name: "asc" },
    }),
  ]);
  const cities = [...new Set(branches.map((b) => b.city))];

  return (
    <ErpPage user={user}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Pricing</p>
          <h1>Promotions</h1>
          <p className="muted">City / branch / product offers applied live at POS and online.</p>
        </div>
      </header>
      <PromoClient
        promotions={promotions}
        branches={branches}
        products={products}
        cities={cities}
      />
    </ErpPage>
  );
}

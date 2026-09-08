"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

const nav: { href: string; label: string; capability: Parameters<typeof can>[1] }[] = [
  { href: "/erp", label: "Dashboard", capability: "dashboard" },
  { href: "/erp/hq", label: "HQ Command", capability: "hq" },
  { href: "/erp/pos", label: "POS", capability: "pos" },
  { href: "/erp/orders", label: "Kitchen Board", capability: "orders" },
  { href: "/erp/products", label: "Products", capability: "products" },
  { href: "/erp/inventory", label: "Inventory", capability: "inventory" },
  { href: "/erp/lots", label: "Lots / FEFO", capability: "lots" },
  { href: "/erp/reorder", label: "Reorder", capability: "reorder" },
  { href: "/erp/purchases", label: "Purchases / GRN", capability: "purchases" },
  { href: "/erp/transfers", label: "Transfers", capability: "transfers" },
  { href: "/erp/production", label: "Production", capability: "production" },
  { href: "/erp/costing", label: "Recipe Costing", capability: "costing" },
  { href: "/erp/promotions", label: "Promotions", capability: "promotions" },
  { href: "/erp/customers", label: "Customers", capability: "crm" },
  { href: "/erp/staff", label: "Staff", capability: "staff" },
  { href: "/erp/accounting", label: "Accounting", capability: "accounting" },
  { href: "/erp/wastage", label: "Wastage", capability: "wastage" },
  { href: "/erp/reports", label: "Reports", capability: "reports" },
  { href: "/erp/branches", label: "Branches", capability: "branches" },
  { href: "/erp/day-close", label: "Day Close", capability: "dayClose" },
  { href: "/erp/audit", label: "Audit Log", capability: "audit" },
];

export function ErpShell({
  children,
  user,
}: {
  children: ReactNode;
  user: { name: string; role: string; branch?: { name: string } | null };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const role = user.role as Role;
  const items = nav.filter((item) => can(role, item.capability));

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/erp/login");
    router.refresh();
  }

  return (
    <div className="erp-shell">
      <aside className="erp-sidebar">
        <div className="erp-brand">
          <Image src="/brand/logo.jpg" alt="Rezist" width={40} height={40} className="erp-logo" />
          <div>
            <strong>Rezist ERP</strong>
            <small>IF YOU CAN</small>
          </div>
        </div>
        <nav>
          {items.map((item) => {
            const active =
              item.href === "/erp" ? pathname === "/erp" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : undefined}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="erp-user">
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.role.replace("_", " ")}
              {user.branch ? ` · ${user.branch.name}` : " · HQ"}
            </small>
          </div>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="erp-main">{children}</main>
    </div>
  );
}

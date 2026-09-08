"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const nav = [
  { href: "/erp", label: "Dashboard" },
  { href: "/erp/pos", label: "POS" },
  { href: "/erp/products", label: "Products" },
  { href: "/erp/inventory", label: "Inventory" },
  { href: "/erp/transfers", label: "Transfers" },
  { href: "/erp/production", label: "Production" },
  { href: "/erp/wastage", label: "Wastage" },
  { href: "/erp/orders", label: "Online Orders" },
  { href: "/erp/reports", label: "Reports" },
  { href: "/erp/branches", label: "Branches" },
  { href: "/erp/day-close", label: "Day Close" },
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

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/erp/login");
    router.refresh();
  }

  return (
    <div className="erp-shell">
      <aside className="erp-sidebar">
        <div className="erp-brand">
          <span className="erp-brand-mark">R</span>
          <div>
            <strong>Rezist ERP</strong>
            <small>Multi-branch bakery</small>
          </div>
        </div>
        <nav>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : undefined}
            >
              {item.label}
            </Link>
          ))}
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

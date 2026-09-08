"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";

const links = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/menu", label: "Menu", icon: "◇" },
  { href: "/order", label: "Cart", icon: "◎", cart: true },
  { href: "/branches", label: "Branches", icon: "◉" },
];

export function MobileDock() {
  const pathname = usePathname();
  const { count } = useCart();
  if (pathname?.startsWith("/erp")) return null;

  return (
    <nav className="lz-dock" aria-label="Primary">
      {links.map((l) => {
        const active =
          l.href === "/"
            ? pathname === "/"
            : pathname === l.href || pathname?.startsWith(`${l.href}/`);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : undefined}>
            <span className="lz-dock-icon" aria-hidden>
              {l.icon}
              {l.cart && count > 0 ? <em>{count > 9 ? "9+" : count}</em> : null}
            </span>
            <span>{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

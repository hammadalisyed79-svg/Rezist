"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatPKR } from "@/lib/utils";
import { useCart } from "@/components/CartProvider";

export function StickyCartBar() {
  const { count, subtotal } = useCart();
  const pathname = usePathname();
  if (!count || pathname?.startsWith("/erp") || pathname === "/order") return null;

  return (
    <div className="lz-sticky-cart" role="status" aria-live="polite">
      <div className="lz-sticky-cart-inner">
        <div>
          <strong>
            {count} item{count === 1 ? "" : "s"}
          </strong>
          <span>{subtotal > 0 ? formatPKR(subtotal) : "Ready when you are"}</span>
        </div>
        <Link href="/order" className="btn">
          Review cart
        </Link>
      </div>
    </div>
  );
}

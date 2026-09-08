"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export function CartBadge() {
  const { count } = useCart();
  return (
    <Link href="/order" className="cart-badge">
      Cart <span>{count}</span>
    </Link>
  );
}

"use client";

import { useCart } from "@/components/CartProvider";

export function AddToCartButton({ productId }: { productId: string }) {
  const { add, cart } = useCart();
  const qty = cart[productId] || 0;
  return (
    <button type="button" className="lz-add" onClick={() => add(productId)}>
      {qty > 0 ? `Added (${qty})` : "+ Add"}
    </button>
  );
}

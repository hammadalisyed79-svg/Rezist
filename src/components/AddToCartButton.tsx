"use client";

import { useCart } from "@/components/CartProvider";

export function AddToCartButton({ productId }: { productId: string }) {
  const { add } = useCart();
  return (
    <button type="button" className="btn-sm" onClick={() => add(productId)}>
      Add
    </button>
  );
}

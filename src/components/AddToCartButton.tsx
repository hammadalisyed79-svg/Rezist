"use client";

import { useCart } from "@/components/CartProvider";

export function AddToCartButton({
  productId,
  unitPrice,
}: {
  productId: string;
  unitPrice?: number;
}) {
  const { add, setQty, cart, justAdded } = useCart();
  const qty = cart[productId] || 0;
  const pulse = justAdded === productId;

  if (qty > 0) {
    return (
      <div className={`lz-stepper${pulse ? " pulse" : ""}`} aria-label="Quantity">
        <button type="button" aria-label="Decrease" onClick={() => setQty(productId, qty - 1, unitPrice)}>
          −
        </button>
        <span>{qty}</span>
        <button type="button" aria-label="Increase" onClick={() => add(productId, 1, unitPrice)}>
          +
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="lz-add" onClick={() => add(productId, 1, unitPrice)}>
      + Add
    </button>
  );
}

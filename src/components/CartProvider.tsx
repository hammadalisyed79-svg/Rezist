"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CartMap = Record<string, number>;

type CartContextValue = {
  cart: CartMap;
  count: number;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  branchId: string;
  setBranchId: (id: string) => void;
  fulfillment: "PICKUP" | "DELIVERY";
  setFulfillment: (v: "PICKUP" | "DELIVERY") => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "rezist_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartMap>({});
  const [branchId, setBranchId] = useState("");
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          cart?: CartMap;
          branchId?: string;
          fulfillment?: "PICKUP" | "DELIVERY";
        };
        setCart(parsed.cart || {});
        setBranchId(parsed.branchId || "");
        setFulfillment(parsed.fulfillment || "PICKUP");
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    sessionStorage.setItem(KEY, JSON.stringify({ cart, branchId, fulfillment }));
  }, [cart, branchId, fulfillment, ready]);

  const add = useCallback((productId: string, qty = 1) => {
    setCart((c) => ({ ...c, [productId]: (c[productId] || 0) + qty }));
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  }, []);

  const clear = useCallback(() => setCart({}), []);

  const count = useMemo(() => Object.values(cart).reduce((a, n) => a + n, 0), [cart]);

  const value = useMemo(
    () => ({ cart, count, add, setQty, clear, branchId, setBranchId, fulfillment, setFulfillment }),
    [cart, count, add, setQty, clear, branchId, fulfillment]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

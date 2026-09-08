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
type PriceMap = Record<string, number>;

type CartContextValue = {
  cart: CartMap;
  prices: PriceMap;
  count: number;
  subtotal: number;
  add: (productId: string, qty?: number, unitPrice?: number) => void;
  setQty: (productId: string, qty: number, unitPrice?: number) => void;
  rememberPrice: (productId: string, unitPrice: number) => void;
  clear: () => void;
  branchId: string;
  setBranchId: (id: string) => void;
  fulfillment: "PICKUP" | "DELIVERY";
  setFulfillment: (v: "PICKUP" | "DELIVERY") => void;
  justAdded: string | null;
};

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "rezist_cart_v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartMap>({});
  const [prices, setPrices] = useState<PriceMap>({});
  const [branchId, setBranchId] = useState("");
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [ready, setReady] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY) || sessionStorage.getItem("rezist_cart_v1");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          cart?: CartMap;
          prices?: PriceMap;
          branchId?: string;
          fulfillment?: "PICKUP" | "DELIVERY";
        };
        setCart(parsed.cart || {});
        setPrices(parsed.prices || {});
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
    sessionStorage.setItem(KEY, JSON.stringify({ cart, prices, branchId, fulfillment }));
  }, [cart, prices, branchId, fulfillment, ready]);

  const bumpAdded = useCallback((productId: string) => {
    setJustAdded(productId);
    window.setTimeout(() => setJustAdded((cur) => (cur === productId ? null : cur)), 900);
  }, []);

  const add = useCallback(
    (productId: string, qty = 1, unitPrice?: number) => {
      setCart((c) => ({ ...c, [productId]: (c[productId] || 0) + qty }));
      if (typeof unitPrice === "number") {
        setPrices((p) => ({ ...p, [productId]: unitPrice }));
      }
      bumpAdded(productId);
    },
    [bumpAdded]
  );

  const setQty = useCallback((productId: string, qty: number, unitPrice?: number) => {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
    if (typeof unitPrice === "number") {
      setPrices((p) => ({ ...p, [productId]: unitPrice }));
    }
    if (qty <= 0) {
      setPrices((p) => {
        const next = { ...p };
        delete next[productId];
        return next;
      });
    }
  }, []);

  const rememberPrice = useCallback((productId: string, unitPrice: number) => {
    setPrices((p) => (p[productId] === unitPrice ? p : { ...p, [productId]: unitPrice }));
  }, []);

  const clear = useCallback(() => {
    setCart({});
    setPrices({});
  }, []);

  const count = useMemo(() => Object.values(cart).reduce((a, n) => a + n, 0), [cart]);
  const subtotal = useMemo(
    () => Object.entries(cart).reduce((a, [id, qty]) => a + qty * (prices[id] || 0), 0),
    [cart, prices]
  );

  const value = useMemo(
    () => ({
      cart,
      prices,
      count,
      subtotal,
      add,
      setQty,
      rememberPrice,
      clear,
      branchId,
      setBranchId,
      fulfillment,
      setFulfillment,
      justAdded,
    }),
    [cart, prices, count, subtotal, add, setQty, rememberPrice, clear, branchId, fulfillment, justAdded]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

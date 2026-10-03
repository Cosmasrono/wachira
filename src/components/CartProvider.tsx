"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  unitPrice: number; // shown in the bag; the server re-prices at checkout
  size: string;
  qty: number;
  measurements?: Record<string, number>;
  fitNote?: string;
};

type NewLine = Omit<CartLine, "key">;

type CartContext = {
  lines: CartLine[];
  loaded: boolean;
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  add: (line: NewLine) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartContext | null>(null);
const STORAGE_KEY = "wachira-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* storage unavailable: start with an empty bag */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, loaded]);

  const add = useCallback((line: NewLine) => {
    setLines((prev) => {
      if (!line.measurements) {
        const key = `${line.productId}:${line.size}`;
        const existing = prev.find((l) => l.key === key);
        if (existing) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l));
        return [...prev, { ...line, key }];
      }
      // Each made-to-measure item is its own line.
      const key = `${line.productId}:custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      return [...prev, { ...line, key }];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      qty <= 0 ? prev.filter((l) => l.key !== key) : prev.map((l) => (l.key === key ? { ...l, qty } : l)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContext>(
    () => ({
      lines,
      loaded,
      open,
      setOpen,
      add,
      setQty,
      clear,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.qty * l.unitPrice, 0),
    }),
    [lines, loaded, open, add, setQty, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

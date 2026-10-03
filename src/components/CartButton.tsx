"use client";

import { useCart } from "./CartProvider";

export default function CartButton() {
  const { count, setOpen } = useCart();
  return (
    <button className="cart-btn" onClick={() => setOpen(true)} aria-label={`Open bag, ${count} items`}>
      Bag <span className="cart-count">{count}</span>
    </button>
  );
}

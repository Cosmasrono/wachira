"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "./CartProvider";
import ProductImage from "./ProductImage";
import { CUSTOM_LEAD_TIME } from "@/lib/config";
import { ksh } from "@/lib/format";

export default function CartDrawer() {
  const { lines, open, setOpen, setQty, subtotal } = useCart();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`drawer${open ? " open" : ""}`} aria-label="Shopping bag" aria-hidden={!open}>
        <header>
          <h3>Your bag</h3>
          <button className="close" onClick={() => setOpen(false)} aria-label="Close bag">✕</button>
        </header>

        <div className="lines">
          {lines.length === 0 && (
            <p className="empty">Your bag is empty. Pick a style, then a size or your measurements.</p>
          )}
          {lines.map((l) => (
            <div className="line" key={l.key}>
              <div className="thumb">
                <ProductImage src={l.image} alt={l.name} sizes="64px" />
              </div>
              <div>
                <Link href={`/products/${l.slug}`} onClick={() => setOpen(false)}>
                  <b>{l.name}</b>
                </Link>
                <small>
                  {l.measurements ? (
                    <>
                      Made to measure <span className="custom-tag">{CUSTOM_LEAD_TIME}</span>
                      <br />
                      {Object.entries(l.measurements).map(([k, v]) => `${k} ${v}`).join(" · ")}
                    </>
                  ) : (
                    <>Size {l.size}</>
                  )}{" "}
                  · {ksh(l.unitPrice)}
                </small>
              </div>
              <div className="qty">
                <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Remove one">−</button>
                {l.qty}
                <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Add one">+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="checkout">
          <div className="row total">
            <span>Subtotal</span>
            <span className="price">{ksh(subtotal)}</span>
          </div>
          <p className="hint">Delivery is added at checkout.</p>
          {lines.length > 0 ? (
            <Link href="/checkout" className="mpesa" onClick={() => setOpen(false)}>
              Checkout
            </Link>
          ) : (
            <button className="mpesa" disabled>Checkout</button>
          )}
        </div>
      </aside>
    </>
  );
}

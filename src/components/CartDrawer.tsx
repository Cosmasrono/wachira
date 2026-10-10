"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "./CartProvider";
import ProductImage from "./ProductImage";
import { CUSTOM_LEAD_TIME } from "@/lib/config";
import { ksh } from "@/lib/format";

export default function CartDrawer() {
  const { lines, open, setOpen, setQty, subtotal } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  return (
    <>
      <dialog ref={dialogRef} className="drawer" aria-labelledby="bag-title"
        onCancel={(event) => { event.preventDefault(); setOpen(false); }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false);
        }}>
        <header>
          <h3 id="bag-title">Your bag</h3>
          <button className="close" autoFocus onClick={() => setOpen(false)} aria-label="Close bag">✕</button>
        </header>

        <div className="lines">
          {lines.length === 0 && (
            <div className="empty"><p>Your bag is empty. Let&apos;s find your next outfit.</p><Link href="/shop" className="btn primary" onClick={() => setOpen(false)}>Browse outfits</Link></div>
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
                <button onClick={() => setQty(l.key, l.qty - 1)} aria-label={`Remove one ${l.name}`}>−</button>
                {l.qty}
                <button onClick={() => setQty(l.key, l.qty + 1)} disabled={l.qty >= 20} aria-label={`Add one ${l.name}`}>+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="checkout">
          <div className="row total">
            <span>Subtotal</span>
            <span className="price">{ksh(subtotal)}</span>
          </div>
          <p className="hint">Choose delivery or free pickup at checkout. Sign in to place your order; your bag stays saved.</p>
          {lines.length > 0 ? (
            <Link href="/checkout" className="mpesa" onClick={() => setOpen(false)}>
              Checkout
            </Link>
          ) : (
            <button className="mpesa" disabled>Checkout</button>
          )}
          <button className="linkish" type="button" onClick={() => setOpen(false)}>Continue shopping</button>
        </div>
      </dialog>
    </>
  );
}

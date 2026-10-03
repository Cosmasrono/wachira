"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./CartProvider";
import ProductImage from "./ProductImage";
import { DELIVERY, DELIVERY_METHODS, deliveryFee, FREE_NAIROBI_OVER, type DeliveryMethod } from "@/lib/config";
import { ksh } from "@/lib/format";

export default function CheckoutForm({ defaultName = "" }: { defaultName?: string }) {
  const router = useRouter();
  const { lines, loaded, subtotal, clear } = useCart();

  const [form, setForm] = useState({
    customerName: defaultName, phone: "", county: "", area: "", notes: "", mpesaPhone: "",
  });
  const [method, setMethod] = useState<DeliveryMethod>("NAIROBI");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const fee = deliveryFee(method, subtotal);
  const total = subtotal + fee;

  if (!loaded) return <p className="hint">Loading your bag…</p>;
  if (lines.length === 0) {
    return (
      <div className="empty-state">
        <p>Your bag is empty.</p>
        <Link className="btn primary" href="/shop">Shop new arrivals</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          mpesaPhone: form.mpesaPhone || form.phone,
          deliveryMethod: method,
          items: lines.map((l) => ({
            productId: l.productId,
            qty: l.qty,
            size: l.measurements ? undefined : l.size,
            measurements: l.measurements,
            fitNote: l.fitNote,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // The session ran out while the form was open: sign in again, then come back here.
        router.push("/login?next=/checkout");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "We couldn't place your order. Please try again.");
        setBusy(false);
        return;
      }
      clear();
      router.push(`/orders/${data.number}`);
    } catch {
      setError("You seem to be offline. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form className="checkout-page" onSubmit={submit} noValidate>
      <div className="checkout-fields">
        <fieldset>
          <legend>Your details</legend>
          <label htmlFor="customerName">Full name
            <input id="customerName" autoComplete="name" value={form.customerName} onChange={set("customerName")} placeholder="Wanjiku Kamau" />
          </label>
          <label htmlFor="phone">Phone (for delivery and WhatsApp)
            <input id="phone" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="0712 345 678" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Delivery</legend>
          <div className="options">
            {DELIVERY_METHODS.map((m) => (
              <label key={m} className="option">
                <input type="radio" name="delivery" checked={method === m} onChange={() => setMethod(m)} />
                <span>{DELIVERY[m].label}</span>
                <span className="price">
                  {deliveryFee(m, subtotal) === 0 ? "Free" : ksh(DELIVERY[m].fee)}
                </span>
              </label>
            ))}
          </div>
          {method === "NAIROBI" && subtotal < FREE_NAIROBI_OVER && (
            <p className="hint">Free Nairobi delivery on orders over {ksh(FREE_NAIROBI_OVER)}.</p>
          )}
          {method !== "PICKUP" && (
            <div className="two">
              <label htmlFor="county">County / town
                <input id="county" value={form.county} onChange={set("county")} placeholder={method === "NAIROBI" ? "Nairobi" : "Nakuru"} />
              </label>
              <label htmlFor="area">Estate / area
                <input id="area" value={form.area} onChange={set("area")} placeholder="Kilimani" />
              </label>
            </div>
          )}
          <label htmlFor="notes">Directions or notes (optional)
            <textarea id="notes" rows={2} value={form.notes} onChange={set("notes")} placeholder="Gate B, call on arrival" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Pay with M-Pesa</legend>
          <label htmlFor="mpesaPhone">M-Pesa number (leave empty to use the phone above)
            <input id="mpesaPhone" inputMode="tel" value={form.mpesaPhone} onChange={set("mpesaPhone")} placeholder={form.phone || "0712 345 678"} />
          </label>
          <p className="hint">You&apos;ll get a prompt on your phone. Enter your M-Pesa PIN to confirm the order.</p>
        </fieldset>
      </div>

      <aside className="summary">
        <h2>Order summary</h2>
        {lines.map((l) => (
          <div className="line" key={l.key}>
            <div className="thumb"><ProductImage src={l.image} alt={l.name} sizes="64px" /></div>
            <div>
              <b>{l.name}</b>
              <small>{l.measurements ? "Made to measure" : `Size ${l.size}`} · Qty {l.qty}</small>
            </div>
            <span className="price">{ksh(l.unitPrice * l.qty)}</span>
          </div>
        ))}
        <div className="row"><span>Subtotal</span><span className="price">{ksh(subtotal)}</span></div>
        <div className="row"><span>Delivery</span><span className="price">{fee === 0 ? "Free" : ksh(fee)}</span></div>
        <div className="row total"><span>Total</span><span className="price">{ksh(total)}</span></div>
        <p className="err" role="alert">{error}</p>
        <button className="mpesa" type="submit" disabled={busy}>
          {busy ? "Sending M-Pesa prompt…" : `Pay ${ksh(total)} with M-Pesa`}
        </button>
      </aside>
    </form>
  );
}

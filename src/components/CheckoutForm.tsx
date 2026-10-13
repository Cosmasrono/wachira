"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartProvider";
import ProductImage from "./ProductImage";
import { DELIVERY, DELIVERY_METHODS, deliveryFee, FREE_NAIROBI_OVER, type DeliveryMethod } from "@/lib/config";
import { ksh } from "@/lib/format";
import { orderInput } from "@/lib/validation";

export default function CheckoutForm({ defaultName = "" }: { defaultName?: string }) {
  const router = useRouter();
  const { lines, loaded, subtotal, clear, setOpen, contact } = useCart();

  const [form, setForm] = useState({
    customerName: defaultName, phone: "", county: "Nairobi", area: "", notes: "", mpesaPhone: "",
  });
  const contactPrefilled = useRef(false);
  useEffect(() => {
    if (!loaded || contactPrefilled.current) return;
    contactPrefilled.current = true;
    setForm((current) => ({ ...current, customerName: contact.name || current.customerName, phone: current.phone || contact.phone }));
  }, [loaded, contact]);
  const [method, setMethod] = useState<DeliveryMethod>("NAIROBI");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [differentPhone, setDifferentPhone] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const submitting = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const inputFeedback = (field: string) => ({
    "aria-invalid": !!fieldErrors[field],
    "aria-describedby": fieldErrors[field] ? `${field}-error` : undefined,
  });
  const feedback = (field: string) => fieldErrors[field]
    ? <span className="err" id={`${field}-error`}>{fieldErrors[field]}</span> : null;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    { setForm((f) => ({ ...f, [k]: e.target.value })); setFieldErrors((errors) => ({ ...errors, [k]: "" })); };

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
    if (submitting.current) return;
    setError("");
    const payload = {
      ...form,
      mpesaPhone: differentPhone ? form.mpesaPhone : form.phone,
      deliveryMethod: method,
      items: lines.map((l) => ({ productId: l.productId, qty: l.qty,
        size: l.measurements ? undefined : l.size, measurements: l.measurements, fitNote: l.fitNote, sampleImage: l.sampleImage })),
    };
    const result = orderInput.safeParse(payload);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) errors[String(issue.path[0])] ??= issue.message;
      setFieldErrors(errors);
      const firstField = Object.keys(errors)[0];
      const input = document.getElementById(firstField);
      if (input) input.focus();
      else setError(Object.values(errors)[0]);
      return;
    }
    setFieldErrors({});
    submitting.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
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
        submitting.current = false;
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
      clear();
      router.push(`/orders/${data.number}`);
    } catch {
      setError("You seem to be offline. Check your connection and try again.");
      setBusy(false);
      submitting.current = false;
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  return (
    <form className="checkout-page" onSubmit={submit} noValidate aria-busy={busy}>
      <div className="checkout-fields">
        <fieldset disabled={busy}>
          <legend>1. Your details</legend>
          <label htmlFor="customerName">Full name
            <input id="customerName" required maxLength={80} {...inputFeedback("customerName")} autoComplete="name" value={form.customerName} onChange={set("customerName")} placeholder="Wanjiku Kamau" />
            {feedback("customerName")}
          </label>
          <label htmlFor="phone">Phone (for delivery and WhatsApp)
            <input id="phone" required type="tel" {...inputFeedback("phone")} autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="0712 345 678" />
            {feedback("phone")}
          </label>
        </fieldset>

        <fieldset disabled={busy}>
          <legend>2. Delivery or pickup</legend>
          <div className="options">
            {DELIVERY_METHODS.map((m) => (
              <label key={m} className="option">
                <input type="radio" name="delivery" checked={method === m} onChange={() => {
                  setMethod(m); setFieldErrors({});
                  setForm((f) => ({ ...f, county: m === "NAIROBI" ? "Nairobi" : f.county === "Nairobi" ? "" : f.county }));
                }} />
                <span>{DELIVERY[m].label}</span>
                <span className="price">
                  {deliveryFee(m, subtotal) === 0 ? "Free" : ksh(DELIVERY[m].fee)}
                </span>
              </label>
            ))}
          </div>
          {method === "NAIROBI" && subtotal < FREE_NAIROBI_OVER && (
            <p className="hint">Add {ksh(FREE_NAIROBI_OVER - subtotal)} more for free Nairobi delivery.</p>
          )}
          {method !== "PICKUP" && (
            <div className="two">
              <label htmlFor="county">County / town
                <input id="county" required maxLength={60} autoComplete="address-level1" {...inputFeedback("county")} value={form.county} onChange={set("county")} placeholder={method === "NAIROBI" ? "Nairobi" : "Nakuru"} />
                {feedback("county")}
              </label>
              <label htmlFor="area">Estate / area
                <input id="area" required maxLength={120} autoComplete="address-level2" {...inputFeedback("area")} value={form.area} onChange={set("area")} placeholder="Kilimani" />
                {feedback("area")}
              </label>
            </div>
          )}
          <label htmlFor="notes">Directions or notes (optional)
            <textarea id="notes" rows={2} maxLength={300} value={form.notes} onChange={set("notes")} placeholder="Gate B, call on arrival" />
          </label>
        </fieldset>

        <fieldset disabled={busy}>
          <legend>3. Pay with M-Pesa</legend>
          <p className="hint">{differentPhone ? "Enter the number you want to pay from." : form.phone ? `We will send the payment prompt to ${form.phone}.` : "We will use the phone number you enter above."}</p>
          <label className="payment-phone-toggle"><input type="checkbox" checked={differentPhone} onChange={(e) => { setDifferentPhone(e.target.checked); setFieldErrors((errors) => ({ ...errors, mpesaPhone: "" })); }} />Pay from a different number</label>
          {differentPhone && <label htmlFor="mpesaPhone">M-Pesa number
            <input id="mpesaPhone" required type="tel" {...inputFeedback("mpesaPhone")} value={form.mpesaPhone} onChange={set("mpesaPhone")} placeholder="0712 345 678" />
            {feedback("mpesaPhone")}
          </label>}
          <p className="hint">Enter your PIN only on the M-Pesa prompt on your phone. You can track your order after payment.</p>
        </fieldset>
      </div>

      <aside className="summary">
        <h2>Order summary</h2>
        <button className="linkish edit-bag" type="button" disabled={busy} onClick={() => setOpen(true)}>Edit your bag</button>
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
        <p className="err" role="alert" ref={errorRef} tabIndex={-1}>{error}</p>
        <button className="mpesa" type="submit" disabled={busy}>
          {busy ? "Sending M-Pesa prompt…" : `Pay ${ksh(total)} with M-Pesa`}
        </button>
      </aside>
    </form>
  );
}

"use client";

import { useRef, useState } from "react";
import { useCart } from "./CartProvider";
import MeasurementGuide from "./MeasurementGuide";
import { ALWAYS_MEASURE, CUSTOM_FEE, CUSTOM_LEAD_TIME } from "@/lib/config";
import { ksh } from "@/lib/format";
import { measurementInCm, MEASUREMENT_GUIDES, type MeasurementUnit } from "@/lib/measurements";

type Props = { product: {
  id: string; slug: string; name: string; price: number; image: string | null;
  sizes: string[]; measureFields: string[]; allowCustom: boolean;
} };

export default function AddToBag({ product }: Props) {
  const { add } = useCart();
  const canCustom = product.allowCustom && product.measureFields.length > 0;
  const fields = [...new Set([...product.measureFields, ALWAYS_MEASURE])];
  const [fit, setFit] = useState<"std" | "custom">("std");
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  const [measures, setMeasures] = useState<Record<string, string>>({});
  const [unit, setUnit] = useState<MeasurementUnit>("cm");
  const [step, setStep] = useState<"measure" | "review">("measure");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const measureHeading = useRef<HTMLHeadingElement>(null);
  const price = product.price + (fit === "custom" ? CUSTOM_FEE : 0);
  const base = { productId: product.id, slug: product.slug, name: product.name, image: product.image, qty: 1 };

  function measurements() {
    const result: Record<string, number> = {};
    for (const field of fields) {
      const value = measurementInCm(measures[field] ?? "", unit);
      if (value === null) {
        setError(`Enter a valid ${field.toLowerCase()} greater than zero and no more than ${unit === "cm" ? "300 cm" : "118.11 inches"}.`);
        document.getElementById(`m-${field}`)?.focus();
        return null;
      }
      result[field] = value;
    }
    return result;
  }

  function changeUnit(next: MeasurementUnit) {
    if (next === unit) return;
    setMeasures((values) => Object.fromEntries(Object.entries(values).map(([field, raw]) => {
      const value = Number(raw.replace(",", "."));
      return [field, raw.trim() && Number.isFinite(value) ? String(Number((value * (next === "in" ? 1 / 2.54 : 2.54)).toFixed(6))) : raw];
    })));
    setUnit(next);
    setError("");
  }

  function submit() {
    setError("");
    if (fit === "std") {
      if (!size) return setError("Choose a size to add this to your bag.");
      add({ ...base, unitPrice: product.price, size });
      return;
    }
    const values = measurements();
    if (!values) return;
    if (step === "measure") {
      setStep("review");
      requestAnimationFrame(() => reviewHeading.current?.focus());
      return;
    }
    add({ ...base, unitPrice: price, size: "Custom", measurements: values, fitNote: note.trim() || undefined });
  }

  return (
    <div className="add">
      <div className="purchase-price"><span className="price big">{ksh(price)}</span><span className="hint">{fit === "custom" ? `Includes ${ksh(CUSTOM_FEE)} custom tailoring` : "Delivery calculated at checkout"}</span></div>
      {canCustom && <div className="fit" role="group" aria-label="Choose your fit">
        <button type="button" aria-pressed={fit === "std"} onClick={() => { setFit("std"); setError(""); }}>Standard size</button>
        <button type="button" aria-pressed={fit === "custom"} onClick={() => { setFit("custom"); setError(""); }}>Made for me</button>
      </div>}
      {fit === "std" ? <div>
        <p className="label">Choose your size</p>
        <div className="sizes" role="group" aria-label="Choose a size">{product.sizes.map((s) => <button key={s} type="button" className="size" aria-pressed={size === s} onClick={() => { setSize(s); setError(""); }}>{s}</button>)}</div>
        <details className="detail-panel"><summary>Need help choosing a size?</summary><p className="hint">Fit can vary by style. Share your usual size and body measurements with us using the product enquiry below so we can help you choose.{canCustom ? " Or select Made for me for a garment tailored to your measurements." : ""}</p></details>
      </div> : <div className="custom-flow">
        <ol className="fit-steps" aria-label="Custom fit progress"><li aria-current={step === "measure" ? "step" : undefined}>01 Measure</li><li aria-current={step === "review" ? "step" : undefined}>02 Review</li></ol>
        {step === "measure" ? <>
          <div className="sec-head compact"><h3 ref={measureHeading} tabIndex={-1}>A fit that feels like you.</h3><div className="unit-toggle" role="group" aria-label="Measurement unit">{(["cm", "in"] as const).map((u) => <button key={u} type="button" aria-pressed={unit === u} onClick={() => changeUnit(u)}>{u === "cm" ? "cm" : "inches"}</button>)}</div></div>
          <MeasurementGuide fields={fields} />
          <div className="measure">{fields.map((f) => <label key={f} htmlFor={`m-${f}`}>{f} ({unit})<input id={`m-${f}`} inputMode="decimal" autoComplete="off" aria-describedby={`help-${f}`} value={measures[f] ?? ""} onChange={(e) => { setMeasures((m) => ({ ...m, [f]: e.target.value })); setError(""); }} /><small id={`help-${f}`}>{MEASUREMENT_GUIDES[f] ?? "Use the guide above or ask us for help."}</small></label>)}
            <label className="full" htmlFor="m-note">Fit notes (optional)<textarea id="m-note" rows={2} maxLength={300} placeholder="For example, a little room at the hips" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          </div>
        </> : <div className="measurement-review">
          <h3 ref={reviewHeading} tabIndex={-1}>Check your measurements</h3><p className="hint">Review these before adding your custom garment to the bag.</p>
          <dl className="review-values">{fields.map((f) => <div key={f}><dt>{f}</dt><dd>{Number(Number((measures[f] ?? "").replace(",", ".")).toFixed(2))} {unit}</dd></div>)}</dl>
          {note.trim() && <p className="hint">Fit notes: {note}</p>}
          <button className="linkish" type="button" onClick={() => { setStep("measure"); requestAnimationFrame(() => measureHeading.current?.focus()); }}>Edit measurements</button>
        </div>}
        <p className="note">Custom tailoring takes <b>{CUSTOM_LEAD_TIME}</b> after payment, before delivery.</p>
      </div>}
      <p className="err" role="alert">{error}</p>
      <button className="btn primary add-button" type="button" onClick={submit}>{fit === "custom" && step === "measure" ? "Review my measurements →" : `Add to bag · ${ksh(price)}`}</button>
      <p className="hint">Pay with M-Pesa at checkout. Choose delivery or Nairobi CBD pickup.</p>
    </div>
  );
}

"use client";

import type { Product } from "@/lib/db";
import { useActionState } from "react";
import { CATEGORIES } from "@/lib/config";
import { saveProduct, type FormState } from "../../../actions";

export default function ProductForm({ product: p }: { product: Product | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct, { error: "" });

  return (
    <form action={action} className="panel product-form">
      {p && <input type="hidden" name="id" value={p.id} />}

      <div className="two">
        <label htmlFor="name">Name
          <input id="name" name="name" defaultValue={p?.name} required />
        </label>
        <label htmlFor="slug">Link name (optional)
          <input id="slug" name="slug" defaultValue={p?.slug} placeholder="made from the name" />
        </label>
      </div>

      <div className="two">
        <label htmlFor="category">Category
          <select id="category" name="category" defaultValue={p?.category ?? "women"}>
            {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </label>
        <label htmlFor="price">Price (KSh)
          <input id="price" name="price" inputMode="numeric" defaultValue={p?.price} required />
        </label>
      </div>

      <label htmlFor="description">Description
        <textarea id="description" name="description" rows={3} defaultValue={p?.description} required />
      </label>

      <label htmlFor="sizes">Sizes, separated by commas
        <input id="sizes" name="sizes" defaultValue={p?.sizes ?? "S,M,L,XL,XXL"} />
      </label>

      <fieldset>
        <legend>Made to measure</legend>
        <label className="check">
          <input type="checkbox" name="allowCustom" defaultChecked={p?.allowCustom ?? true} /> Customers can order this in their own measurements
        </label>
        <label htmlFor="measureFields">Measurements to ask for, separated by commas (height is always asked)
          <input id="measureFields" name="measureFields" defaultValue={p?.measureFields ?? "Bust,Waist,Hips,Dress length"} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Photos</legend>
        <p className="hint">Put photos in the <code>public/products</code> folder, then enter the path, e.g. /products/amani-1.jpg</p>
        <div className="two">
          <label htmlFor="image">Main photo
            <input id="image" name="image" defaultValue={p?.image ?? ""} placeholder="/products/name-1.jpg" />
          </label>
          <label htmlFor="image2">Second photo (shown on hover)
            <input id="image2" name="image2" defaultValue={p?.image2 ?? ""} placeholder="/products/name-2.jpg" />
          </label>
        </div>
      </fieldset>

      <div className="two">
        <label htmlFor="badge">Badge (optional)
          <input id="badge" name="badge" defaultValue={p?.badge ?? ""} placeholder="New, Limited…" />
        </label>
        <label htmlFor="colors">Colour swatches (hex, comma separated)
          <input id="colors" name="colors" defaultValue={p?.colors ?? ""} placeholder="#2F3D8C,#D9C39A" />
        </label>
      </div>

      <label className="check">
        <input type="checkbox" name="featured" defaultChecked={p?.featured ?? false} /> Feature on the home page
      </label>
      <label className="check">
        <input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Show in the shop
      </label>

      <p className="err" role="alert">{state.error}</p>
      <button className="btn primary" disabled={pending}>{pending ? "Saving…" : "Save product"}</button>
    </form>
  );
}

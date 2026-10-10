"use client";

import type { Product } from "@/lib/db";
import { useActionState, useState } from "react";
import { CATEGORIES } from "@/lib/config";
import { saveProduct, type FormState } from "../../../actions";
import AdminImageUpload from "@/components/AdminImageUpload";
import type { Look } from "@/lib/looks";
import {
  Image as ImageIcon,
  Ruler,
  Layers,
  Palette,
  Sparkles,
  Save,
  Loader2,
  Check,
  Plus,
  AlertCircle
} from "lucide-react";

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const COMMON_MEASUREMENTS = [
  "Bust",
  "Waist",
  "Hips",
  "Dress length",
  "Shoulder",
  "Sleeve length",
  "Inseam",
  "Trouser length"
];

const PRESET_COLORS = [
  { name: "Navy", hex: "#1E3A8A" },
  { name: "Midnight", hex: "#0F172A" },
  { name: "Charcoal", hex: "#334155" },
  { name: "Emerald", hex: "#065F46" },
  { name: "Wine", hex: "#881337" },
  { name: "Ochre / Gold", hex: "#B45309" },
  { name: "Warm Khaki", hex: "#A89F91" },
  { name: "Crisp White", hex: "#FFFFFF" }
];

export default function ProductForm({ product: p, sample }: { product: Product | null; sample?: Look }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct, { error: "" });

  // Live state for interactive fields
  const [image, setImage] = useState(p?.image ?? (sample ? `/products/${sample.image}` : ""));
  const [image2, setImage2] = useState(p?.image2 ?? "");
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingSecond, setUploadingSecond] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    p?.sizes ? p.sizes.split(",").map((s) => s.trim()).filter(Boolean) : ["S", "M", "L", "XL", "XXL"]
  );
  const [allowCustom, setAllowCustom] = useState(p?.allowCustom ?? true);
  const [measureList, setMeasureList] = useState<string[]>(
    p?.measureFields ? p.measureFields.split(",").map((m) => m.trim()).filter(Boolean) : ["Bust", "Waist", "Hips", "Dress length"]
  );
  const [colorSwatches, setColorSwatches] = useState<string[]>(
    p?.colors ? p.colors.split(",").map((c) => c.trim()).filter(Boolean) : []
  );
  const [newColor, setNewColor] = useState("#1E3A8A");

  function toggleSize(size: string) {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  }

  function toggleMeasure(field: string) {
    if (measureList.includes(field)) {
      setMeasureList(measureList.filter((m) => m !== field));
    } else {
      setMeasureList([...measureList, field]);
    }
  }

  function addColor(hex: string) {
    const clean = hex.trim().toUpperCase();
    if (clean && !colorSwatches.includes(clean)) {
      setColorSwatches([...colorSwatches, clean]);
    }
  }

  function removeColor(hex: string) {
    setColorSwatches(colorSwatches.filter((c) => c !== hex));
  }

  return (
    <form action={action} className="product-form-container" onSubmit={(event) => {
      if (uploadingMain || uploadingSecond) event.preventDefault();
    }}>
      {p && <input type="hidden" name="id" value={p.id} />}

      {/* Hidden inputs synced with interactive chips */}
      <input type="hidden" name="sizes" value={selectedSizes.join(",")} />
      <input type="hidden" name="measureFields" value={measureList.join(",")} />
      <input type="hidden" name="colors" value={colorSwatches.join(",")} />

      {state.error && (
        <div className="auth-alert-error" role="alert">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* 1. Basic Info */}
      <div className="admin-form-card">
        <div className="admin-card-head">
          <Layers size={18} className="text-accent" />
          <h3>Basic Details</h3>
        </div>

        <div className="two">
          <label htmlFor="name">
            Product name <span className="req">*</span>
            <input id="name" name="name" defaultValue={p?.name ?? sample?.name} required placeholder="e.g. Amani Navy Three-Piece Suit" />
          </label>
          <label htmlFor="slug">
            URL Slug (optional)
            <input id="slug" name="slug" defaultValue={p?.slug} placeholder="auto-generated-from-name" />
          </label>
        </div>

        <div className="two">
          <label htmlFor="category">
            Category <span className="req">*</span>
            <select id="category" name="category" defaultValue={p?.category ?? (sample?.category === "men" ? "men" : "women")}>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="price">
            Price (KSh, optional)
            <input
              id="price"
              name="price"
              inputMode="numeric"
              defaultValue={p?.price}
              placeholder="Leave blank for price on consultation"
            />
          </label>
        </div>

        <label htmlFor="description">
          Description <span className="req">*</span>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={p?.description}
            required
            placeholder="Fabric details, cut, lining, care instructions..."
          />
        </label>
      </div>

      {/* 2. Sizing & Custom Fit */}
      <div className="admin-form-card">
        <div className="admin-card-head">
          <Ruler size={18} className="text-accent" />
          <h3>Sizes &amp; Bespoke Measurements</h3>
        </div>

        <div className="field-group">
          <span className="field-label">Available standard sizes (click to toggle)</span>
          <div className="chips-row">
            {STANDARD_SIZES.map((size) => {
              const active = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`chip-btn ${active ? "active" : ""}`}
                  aria-pressed={active}
                >
                  {active && <Check size={14} className="mr-1" />}
                  {size}
                </button>
              );
            })}
          </div>
          <p className="hint">Selected sizes: <b>{selectedSizes.join(", ") || "None"}</b></p>
        </div>

        <div className="bespoke-box">
          <label className="check-styled">
            <input
              type="checkbox"
              name="allowCustom"
              checked={allowCustom}
              onChange={(e) => setAllowCustom(e.target.checked)}
            />
            <span className="check-text">
              <b>Enable Made-to-Measure for this product</b>
              <small>Shoppers can enter their custom measurements during checkout.</small>
            </span>
          </label>

          {allowCustom && (
            <div className="measure-fields-select mt-3">
              <span className="field-label">Measurements required (Height is always asked):</span>
              <div className="chips-row">
                {COMMON_MEASUREMENTS.map((field) => {
                  const active = measureList.includes(field);
                  return (
                    <button
                      key={field}
                      type="button"
                      onClick={() => toggleMeasure(field)}
                      className={`chip-btn ${active ? "active" : ""}`}
                    >
                      {active && <Check size={14} className="mr-1" />}
                      {field}
                    </button>
                  );
                })}
              </div>
              <p className="hint">Selected: <b>{measureList.join(", ") || "None"}</b></p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Photos & Media Preview */}
      <div className="admin-form-card">
        <div className="admin-card-head">
          <ImageIcon size={18} className="text-accent" />
          <h3>Product Photos &amp; Live Preview</h3>
        </div>
        <p className="hint mb-3">
          Upload a product or sample photo and add its details. Customers can consult about published samples on WhatsApp.
        </p>

        <div className="two image-preview-grid">
          <div className="image-input-col">
            <AdminImageUpload label="Upload main photo" onUpload={setImage} onBusy={setUploadingMain} />
            <label htmlFor="image">
              Main photo path
              <input
                id="image"
                name="image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="/products/name-1.jpg"
              />
            </label>
            <div className="img-preview-frame">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image}
                  src={image}
                  alt="Main preview"
                  onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                  className="preview-img"
                />
              ) : (
                <div className="preview-empty">
                  <ImageIcon size={28} className="text-muted" />
                  <span>No photo specified</span>
                </div>
              )}
            </div>
          </div>

          <div className="image-input-col">
            <AdminImageUpload label="Upload second photo" onUpload={setImage2} onBusy={setUploadingSecond} />
            <label htmlFor="image2">
              Hover photo path (optional)
              <input
                id="image2"
                name="image2"
                value={image2}
                onChange={(e) => setImage2(e.target.value)}
                placeholder="/products/name-2.jpg"
              />
            </label>
            <div className="img-preview-frame">
              {image2 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image2}
                  src={image2}
                  alt="Hover preview"
                  onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                  className="preview-img"
                />
              ) : (
                <div className="preview-empty">
                  <ImageIcon size={28} className="text-muted" />
                  <span>No hover photo</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Swatches & Badges */}
      <div className="admin-form-card">
        <div className="admin-card-head">
          <Palette size={18} className="text-accent" />
          <h3>Colors &amp; Merchandising</h3>
        </div>

        <div className="two">
          <label htmlFor="badge">
            Badge (e.g. New, Bestseller, Limited)
            <input id="badge" name="badge" defaultValue={p?.badge ?? ""} placeholder="e.g. New Season" />
          </label>

          <div className="color-picker-section">
            <span className="field-label">Add colour swatches</span>
            <div className="color-input-bar">
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="color-wheel"
                title="Pick custom color"
              />
              <button
                type="button"
                className="btn sm"
                onClick={() => addColor(newColor)}
              >
                <Plus size={14} /> Add Color
              </button>
            </div>
            <div className="preset-colors">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  className="preset-swatch"
                  style={{ backgroundColor: c.hex }}
                  title={`Add ${c.name} (${c.hex})`}
                  onClick={() => addColor(c.hex)}
                />
              ))}
            </div>
          </div>
        </div>

        {colorSwatches.length > 0 && (
          <div className="active-swatches mt-3">
            <span className="field-label">Active swatches (click &times; to remove):</span>
            <div className="swatch-chips">
              {colorSwatches.map((hex) => (
                <span key={hex} className="swatch-tag">
                  <span className="swatch-dot" style={{ backgroundColor: hex }} />
                  <code>{hex}</code>
                  <button type="button" onClick={() => removeColor(hex)} className="swatch-remove">
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="toggles-row mt-4">
          <label className="check-styled">
            <input type="checkbox" name="featured" defaultChecked={p?.featured ?? false} />
            <span className="check-text">
              <Sparkles size={16} className="text-gold" />
              <b>Feature on homepage</b>
            </span>
          </label>

          <label className="check-styled">
            <input type="checkbox" name="active" defaultChecked={p?.active ?? true} />
            <span className="check-text">
              <b>Publish in shop and style gallery</b>
            </span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="admin-form-actions">
        <button className="btn primary lg" disabled={pending || uploadingMain || uploadingSecond} type="submit">
          {pending ? (
            <>
              <Loader2 className="animate-spin" size={18} /> Saving product...
            </>
          ) : (
            <>
              <Save size={18} /> Save product
            </>
          )}
        </button>
      </div>
    </form>
  );
}

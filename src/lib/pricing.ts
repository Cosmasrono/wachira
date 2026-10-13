import { db } from "./db";
import { ALWAYS_MEASURE, CUSTOM_FEE, deliveryFee, type DeliveryMethod } from "./config";
import { splitList } from "./format";
import type { OrderInput } from "./validation";
import { LOOKS } from "./looks";

export class PricingError extends Error {}

/**
 * Prices an order from the database. Never trust prices sent by the browser.
 */
export async function priceOrder(items: OrderInput["items"], method: DeliveryMethod) {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await db.product.findMany({ where: { id: { in: ids }, active: true } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = items.map((item) => {
    const p = byId.get(item.productId);
    if (!p) {
      throw new PricingError("One of the items is no longer available. Remove it from your bag and try again.");
    }

    if (p.price <= 0) throw new PricingError(`Please consult with us on WhatsApp about ${p.name} before ordering.`);
    const sampleImages = Array.from(new Set([p.image, p.image2].filter((image): image is string => !!image)));
    if (item.sampleImage && !sampleImages.includes(item.sampleImage)) {
      throw new PricingError(`The selected outfit picture for ${p.name} is no longer available. Please choose it again.`);
    }
    const sampleLabel = LOOKS.find((look) => `/products/${look.image}` === item.sampleImage)?.name ?? `Sample ${sampleImages.indexOf(item.sampleImage ?? "") + 1}`;
    const name = item.sampleImage ? `${p.name} — ${sampleLabel}` : p.name;

    if (item.measurements) {
      const fields = [...splitList(p.measureFields), ALWAYS_MEASURE];
      if (!p.allowCustom || fields.length === 1) {
        throw new PricingError(`${p.name} is only available in standard sizes.`);
      }
      const missing = fields.find((f) => !(item.measurements![f] > 0));
      if (missing) throw new PricingError(`Enter your ${missing.toLowerCase()} for ${p.name}.`);
      const measurements = Object.fromEntries(fields.map((f) => [f, item.measurements![f]]));
      return {
        productId: p.id,
        name,
        unitPrice: p.price + CUSTOM_FEE,
        qty: item.qty,
        size: "Custom",
        custom: true,
        measurements: JSON.stringify(measurements),
        fitNote: item.fitNote || null,
      };
    }

    if (!item.size || !splitList(p.sizes).includes(item.size)) {
      throw new PricingError(`Choose a size for ${p.name}.`);
    }
    return {
      productId: p.id,
      name,
      unitPrice: p.price,
      qty: item.qty,
      size: item.size,
      custom: false,
      measurements: null,
      fitNote: null,
    };
  });

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const fee = deliveryFee(method, subtotal);
  return {
    lines,
    subtotal,
    deliveryFee: fee,
    total: subtotal + fee,
    hasCustom: lines.some((l) => l.custom),
  };
}

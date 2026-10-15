// Business settings. Change prices, fees and lead times here.

export const SITE = {
  name: "Wachira",
  tagline: "Clothing made in Kenya",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "2547XXXXXXXX",
};

export const CATEGORIES = [
  { slug: "women", label: "Women" },
  { slug: "men", label: "Men" },
] as const;

export type Category = (typeof CATEGORIES)[number]["slug"];

export const categoryLabel = (slug: string) =>
  CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;

/** Extra charge for made-to-measure items, per item (KSh). */
export const CUSTOM_FEE = 800;
export const CUSTOM_LEAD_TIME = "5–7 days";

/** Every custom order also asks for the customer's height. */
export const ALWAYS_MEASURE = "Height";

/** Where we're based and where pickups happen. */
export const HQ = "Nakuru";

export const DELIVERY = {
  PICKUP: { label: `Pick up – ${HQ} HQ`, fee: 0 },
  COUNTY: { label: "Delivery anywhere in Kenya", fee: 550 },
} as const;

export type DeliveryMethod = keyof typeof DELIVERY;
export const DELIVERY_METHODS = Object.keys(DELIVERY) as DeliveryMethod[];

/** Labels for methods that are no longer offered, so older orders still read correctly. */
const PAST_DELIVERY: Record<string, string> = { NAIROBI: "Nairobi delivery" };

export function deliveryLabel(method: string) {
  return DELIVERY[method as DeliveryMethod]?.label ?? PAST_DELIVERY[method] ?? method;
}

export function deliveryFee(method: DeliveryMethod, _subtotal: number) {
  return DELIVERY[method].fee;
}

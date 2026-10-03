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

export const FREE_NAIROBI_OVER = 5000;

export const DELIVERY = {
  PICKUP: { label: "Pick up – Nairobi CBD", fee: 0 },
  NAIROBI: { label: "Nairobi delivery", fee: 300 },
  COUNTY: { label: "Other counties", fee: 550 },
} as const;

export type DeliveryMethod = keyof typeof DELIVERY;
export const DELIVERY_METHODS = Object.keys(DELIVERY) as DeliveryMethod[];

export function deliveryFee(method: DeliveryMethod, subtotal: number) {
  if (method === "NAIROBI" && subtotal >= FREE_NAIROBI_OVER) return 0;
  return DELIVERY[method].fee;
}

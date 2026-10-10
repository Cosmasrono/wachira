import { SITE } from "./config";

export const whatsappConfigured = () => /^\d{10,15}$/.test(SITE.whatsapp);
export function consultationHref(name?: string, slug?: string, origin = "") {
  if (!whatsappConfigured()) return "/contact";
  const message = name
    ? `Hello Wachira, I would like to consult about ${name}.${slug ? ` ${origin}/products/${slug}` : ""} Please help me with availability, fabric, sizing and price.`
    : "Hello Wachira, I would like to consult about an outfit. Please help me with styles, sizing and prices.";
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
}

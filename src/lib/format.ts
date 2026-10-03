const kshFormat = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

export const ksh = (n: number) => `KSh ${kshFormat.format(n)}`;

/** Accepts 0712…, 0112…, 712…, 254712…, +254712… and returns 254XXXXXXXXX, or null. */
export function normalizePhone(input: string): string | null {
  const d = input.replace(/[\s-]/g, "").replace(/^\+/, "");
  if (/^0[17]\d{8}$/.test(d)) return "254" + d.slice(1);
  if (/^254[17]\d{8}$/.test(d)) return d;
  if (/^[17]\d{8}$/.test(d)) return "254" + d;
  return null;
}

/** 254712345678 -> 0712 345 678 */
export function displayPhone(p: string) {
  const local = p.startsWith("254") ? "0" + p.slice(3) : p;
  return local.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");
}

export const splitList = (s: string | null | undefined) =>
  (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-");

export const formatDate = (d: Date) =>
  new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(d);

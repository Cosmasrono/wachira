import { z } from "zod";
import { CATEGORIES, DELIVERY_METHODS, type DeliveryMethod } from "./config";
import { normalizePhone } from "./format";

const phone = (message: string) =>
  z.string().trim().refine((v) => normalizePhone(v) !== null, message);

export const orderItemInput = z.object({
  productId: z.string().min(1),
  qty: z.number().int().min(1).max(20),
  size: z.string().max(20).optional(),
  measurements: z.record(z.string(), z.number().positive().max(300)).optional(),
  fitNote: z.string().trim().max(300).optional(),
  sampleImage: z.string().max(2048).optional(),
});

export const orderInput = z
  .object({
    customerName: z.string().trim().min(2, "Enter your full name.").max(80),
    phone: phone("Enter a phone number like 0712 345 678."),
    paymentMethod: z.enum(["MPESA", "CASH"]).default("MPESA"),
    mpesaPhone: z.string().max(30).optional(),
    deliveryMethod: z.enum(DELIVERY_METHODS as [DeliveryMethod, ...DeliveryMethod[]]),
    county: z.string().trim().max(60).default(""),
    area: z.string().trim().max(120).default(""),
    notes: z.string().trim().max(300).default(""),
    items: z.array(orderItemInput).min(1, "Your bag is empty.").max(30),
  })
  .superRefine((v, ctx) => {
    if (v.paymentMethod === "MPESA" && !normalizePhone(v.mpesaPhone ?? "")) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mpesaPhone"], message: "Enter the Safaricom number you'll pay from." });
    }
    if (v.deliveryMethod !== "PICKUP") {
      if (!v.county) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["county"], message: "Enter your county or town." });
      if (!v.area) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["area"], message: "Enter your estate or area so we can deliver." });
    }
  });

export type OrderInput = z.infer<typeof orderInput>;

const categorySlugs = CATEGORIES.map((c) => c.slug) as [string, ...string[]];

export const productInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter a product name.").max(80),
  slug: z.string().trim().max(80).default(""),
  category: z.enum(categorySlugs),
  description: z.string().trim().min(5, "Add a short description.").max(1000),
  price: z.coerce.number().int("Price must be whole shillings.").min(0, "Price cannot be negative."),
  sizes: z.string().trim().min(1, "Add at least one size."),
  measureFields: z.string().trim().default(""),
  allowCustom: z.boolean(),
  image: z.string().trim().default(""),
  image2: z.string().trim().default(""),
  badge: z.string().trim().max(20).default(""),
  colors: z.string().trim().default(""),
  featured: z.boolean(),
  active: z.boolean(),
});

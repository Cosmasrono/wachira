import { z } from "zod";

export const callbackSchema = z.object({
  Body: z.object({ stkCallback: z.object({
    CheckoutRequestID: z.string().min(1).max(200),
    ResultCode: z.union([z.number().int(), z.string().regex(/^\d+$/)]),
    ResultDesc: z.string().max(1000).optional(),
    CallbackMetadata: z.object({ Item: z.array(z.object({
      Name: z.string(), Value: z.union([z.string(), z.number()]).optional(),
    })).max(20) }).optional(),
  }) }),
});

export function paidMetadata(items: { Name: string; Value?: string | number }[] | undefined) {
  const amountValues = items?.filter((i) => i.Name === "Amount") ?? [];
  const receiptValues = items?.filter((i) => i.Name === "MpesaReceiptNumber") ?? [];
  const amount = Number(amountValues[0]?.Value);
  const receipt = receiptValues[0]?.Value;
  if (amountValues.length !== 1 || receiptValues.length !== 1 || !Number.isFinite(amount) || amount <= 0 ||
      typeof receipt !== "string" || !/^[A-Za-z0-9]{5,40}$/.test(receipt)) return null;
  return { amount, receipt };
}

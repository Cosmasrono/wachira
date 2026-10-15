// M-Pesa collections through PayHero: https://docs.payhero.co.ke
import { z } from "zod";

export class MpesaError extends Error {}

export const isMockPayments = () => {
  if (process.env.NODE_ENV === "production" && process.env.MPESA_MODE === "mock") {
    throw new MpesaError("Mock payments are disabled in production.");
  }
  return process.env.NODE_ENV !== "production" && process.env.MPESA_MODE === "mock";
};

function authorization() {
  const username = process.env.PAYHERO_API_USERNAME;
  const password = process.env.PAYHERO_API_PASSWORD;
  if (!username || !password) throw new MpesaError("PayHero credentials are not configured.");
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function request(path: string, body?: object) {
  const response = await fetch(`https://backend.payhero.co.ke/api/v2/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: authorization(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20_000),
  });
  // Do not expose provider responses or credentials in customer-facing errors.
  if (!response.ok) throw new MpesaError("PayHero could not process the request. Please try again later.");
  return response.json() as Promise<unknown>;
}

const pushResponse = z.object({ success: z.literal(true), reference: z.string().min(1).max(200), CheckoutRequestID: z.string().min(1).max(200) });

export async function stkPush(opts: { phone: string; amount: number; reference: string; description: string }) {
  const channel = Number(process.env.PAYHERO_CHANNEL_ID);
  if (!Number.isSafeInteger(channel) || channel <= 0) throw new MpesaError("PayHero payment channel is not configured.");
  const origin = new URL(process.env.APP_URL ?? "");
  const secret = process.env.PAYHERO_CALLBACK_SECRET;
  const local = process.env.NODE_ENV !== "production" && origin.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (origin.username || origin.password || (!local && (origin.protocol !== "https:" || !secret || secret.length < 32))) {
    throw new MpesaError("PayHero requires a public HTTPS callback URL and callback secret.");
  }
  if (!Number.isSafeInteger(opts.amount) || opts.amount <= 0) throw new MpesaError("Invalid payment amount.");
  const result = pushResponse.safeParse(await request("payments", {
    amount: opts.amount, phone_number: opts.phone, channel_id: channel, provider: "m-pesa",
    external_reference: opts.reference,
    // PayHero cannot reach localhost; authenticated status polling confirms local payments.
    ...(!local ? { callback_url: `${origin.origin}/api/payhero/callback/${encodeURIComponent(secret!)}` } : {}),
  }));
  if (!result.success) throw new MpesaError("PayHero did not return a valid payment reference.");
  return { checkoutRequestId: result.data.CheckoutRequestID, providerReference: result.data.reference };
}

export type PaymentState = { state: "pending" | "paid" | "failed"; message: string; receipt?: string };
const statusResponse = z.object({
  reference: z.string(), status: z.string(), success: z.boolean().optional(),
  CheckoutRequestID: z.string().optional(), provider_reference: z.string().optional(),
});

export async function stkQuery(checkoutRequestId: string, providerReference?: string | null): Promise<PaymentState> {
  // Older Daraja attempts have no PayHero reference; never send them to PayHero.
  if (!providerReference) return { state: "pending", message: "Awaiting payment confirmation." };
  const parsed = statusResponse.safeParse(await request(`transaction-status?reference=${encodeURIComponent(providerReference)}`));
  if (!parsed.success || parsed.data.reference !== providerReference ||
      (parsed.data.CheckoutRequestID && parsed.data.CheckoutRequestID !== checkoutRequestId)) {
    return { state: "pending", message: "Awaiting payment confirmation." };
  }
  const data = parsed.data;
  if (data.status === "SUCCESS" && data.success === true && /^[A-Za-z0-9]{5,40}$/.test(data.provider_reference ?? "")) {
    return { state: "paid", message: "Payment confirmed.", receipt: data.provider_reference };
  }
  if (data.status === "FAILED") return { state: "failed", message: "The payment was not completed. Please try again." };
  return { state: "pending", message: "Waiting for your M-Pesa payment." };
}

/** Turns M-Pesa result codes into messages a customer understands. */
export function friendlyResult(code: string | number | undefined, desc?: string) {
  switch (String(code)) {
    case "1032": return "You cancelled the M-Pesa prompt.";
    case "1037": return "The M-Pesa prompt timed out. Try again and enter your PIN when it appears.";
    case "1": return "Your M-Pesa balance is too low for this payment.";
    case "2001": return "The M-Pesa PIN was wrong. Try again.";
    default: return desc || "The payment was not completed.";
  }
}

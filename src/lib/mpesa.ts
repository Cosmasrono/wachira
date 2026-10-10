// Safaricom Daraja: STK push (Lipa na M-Pesa Online) and status query.
// Docs: https://developer.safaricom.co.ke

export class MpesaError extends Error {}

const baseUrl = () =>
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

/**
 * Mock mode simulates payments so you can test without Daraja keys.
 * It's on when MPESA_MODE=mock, or in development when no keys are set.
 * It is never switched on automatically in production.
 */
export const isMockPayments = () => {
  if (process.env.NODE_ENV === "production" && process.env.MPESA_MODE === "mock") {
    throw new MpesaError("Mock payments are disabled in production.");
  }
  return process.env.NODE_ENV !== "production" &&
    (process.env.MPESA_MODE === "mock" || !process.env.MPESA_CONSUMER_KEY);
};

let cachedToken: { value: string; expires: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.value;
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new MpesaError("M-Pesa keys are not set.");

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new MpesaError(`M-Pesa login failed (${res.status}).`);
  const data = (await res.json()) as { access_token: string; expires_in: string };
  cachedToken = {
    value: data.access_token,
    expires: Date.now() + (Number(data.expires_in) - 60) * 1000,
  };
  return cachedToken.value;
}

/** yyyyMMddHHmmss in Kenyan time (UTC+3). */
function timestamp() {
  return new Date(Date.now() + 3 * 3600_000).toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

function credentials() {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortcode || !passkey) throw new MpesaError("M-Pesa shortcode or passkey is not set.");
  const ts = timestamp();
  return {
    BusinessShortCode: shortcode,
    Password: Buffer.from(shortcode + passkey + ts).toString("base64"),
    Timestamp: ts,
  };
}

async function post(path: string, body: object) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data: data as Record<string, string | undefined> };
}

export async function stkPush(opts: { phone: string; amount: number; reference: string; description: string }) {
  const creds = credentials();
  const { ok, data } = await post("/mpesa/stkpush/v1/processrequest", {
    ...creds,
    TransactionType: process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline",
    Amount: Math.round(opts.amount),
    PartyA: opts.phone,
    PartyB: process.env.MPESA_PARTY_B || creds.BusinessShortCode,
    PhoneNumber: opts.phone,
    CallBackURL: `${process.env.APP_URL}/api/mpesa/callback/${process.env.MPESA_CALLBACK_SECRET}`,
    AccountReference: opts.reference.slice(0, 12),
    TransactionDesc: opts.description.slice(0, 13),
  });
  if (!ok || data.ResponseCode !== "0" || !data.CheckoutRequestID) {
    throw new MpesaError(data.errorMessage || data.ResponseDescription || "M-Pesa request failed.");
  }
  return { checkoutRequestId: data.CheckoutRequestID };
}

export type PaymentState = { state: "pending" | "paid" | "failed"; message: string };

export async function stkQuery(checkoutRequestId: string): Promise<PaymentState> {
  const { data } = await post("/mpesa/stkpushquery/v1/query", {
    ...credentials(),
    CheckoutRequestID: checkoutRequestId,
  });
  // Still waiting for the customer, or a transient error.
  if (data.ResultCode === undefined) return { state: "pending", message: data.errorMessage ?? "" };
  if (String(data.ResultCode) === "0") return { state: "paid", message: data.ResultDesc ?? "" };
  return { state: "failed", message: friendlyResult(data.ResultCode, data.ResultDesc) };
}

/** Turns Daraja result codes into messages a customer understands. */
export function friendlyResult(code: string | number | undefined, desc?: string) {
  switch (String(code)) {
    case "1032": return "You cancelled the M-Pesa prompt.";
    case "1037": return "The M-Pesa prompt timed out. Try again and enter your PIN when it appears.";
    case "1": return "Your M-Pesa balance is too low for this payment.";
    case "2001": return "The M-Pesa PIN was wrong. Try again.";
    default: return desc || "The payment was not completed.";
  }
}

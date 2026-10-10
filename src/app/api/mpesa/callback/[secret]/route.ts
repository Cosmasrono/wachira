import { after, NextResponse } from "next/server";
import { friendlyResult } from "@/lib/mpesa";
import { findPaymentOrder, markFailed, markPaid } from "@/lib/orders";
import { callbackSchema, paidMetadata } from "@/lib/payment-callback";
import { processOrderMailJobs } from "@/lib/order-mail";

/**
 * Safaricom posts the STK push result here. The secret in the URL stops
 * other people from faking payment results.
 */
export async function POST(req: Request, { params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  if (!process.env.MPESA_CALLBACK_SECRET || secret !== process.env.MPESA_CALLBACK_SECRET) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 401 });
  }

  const accepted = NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  const body = await req.json().catch(() => null);
  const parsed = callbackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback" }, { status: 400 });
  const cb = parsed.data.Body.stkCallback;

  const order = await findPaymentOrder(cb.CheckoutRequestID);
  // A callback can race the persistence of the STK response; don't acknowledge it as processed.
  if (!order) return NextResponse.json({ ResultCode: 1, ResultDesc: "Unknown request" }, { status: 503 });

  if (Number(cb.ResultCode) !== 0) {
    await markFailed(order.id, friendlyResult(cb.ResultCode, cb.ResultDesc), cb.CheckoutRequestID);
    return accepted;
  }

  const metadata = paidMetadata(cb.CallbackMetadata?.Item);
  if (!metadata) return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payment metadata" }, { status: 400 });
  const { amount, receipt } = metadata;

  if (amount < order.total) {
    const note = `Received KSh ${amount}, expected KSh ${order.total}. Check this payment manually.`;
    await markFailed(order.id, note, cb.CheckoutRequestID);
    return accepted;
  }

  await markPaid(order.id, receipt, cb.CheckoutRequestID);
  after(() => processOrderMailJobs(order.id));
  return accepted;
}

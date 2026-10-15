import { timingSafeEqual } from "node:crypto";
import { after, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { stkQuery } from "@/lib/mpesa";
import { markFailed, markPaid } from "@/lib/orders";
import { processOrderMailJobs } from "@/lib/order-mail";
import { payheroCallbackSchema } from "@/lib/payment-callback";

export async function POST(req: Request, { params }: { params: Promise<{ secret: string }> }) {
  const supplied = Buffer.from((await params).secret);
  const expected = Buffer.from(process.env.PAYHERO_CALLBACK_SECRET ?? "");
  if (expected.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "Rejected" }, { status: 401 });
  }
  const parsed = payheroCallbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid callback" }, { status: 400 });
  const cb = parsed.data.response;
  const attempt = await db.paymentAttempt.findUnique({ where: { requestId: cb.CheckoutRequestID } });
  // A callback can arrive before the push response is persisted. Retry instead of dropping it.
  if (!attempt?.providerReference) return NextResponse.json({ error: "Awaiting payment reference" }, { status: 503 });
  const order = await db.order.findUnique({ where: { id: attempt.orderId } });
  if (!order || cb.ExternalReference !== order.number) return NextResponse.json({ error: "Reference mismatch" }, { status: 400 });

  // Verify with PayHero using server credentials, even when the callback URL secret matches.
  const verified = await stkQuery(attempt.requestId, attempt.providerReference).catch(() => null);
  if (!verified || verified.state === "pending") return NextResponse.json({ error: "Awaiting confirmation" }, { status: 503 });
  if (verified.state === "failed") {
    await markFailed(order.id, verified.message, attempt.requestId);
  } else {
    if (Number(cb.ResultCode) !== 0 || cb.Amount !== attempt.amount || attempt.amount !== order.total ||
        !cb.MpesaReceiptNumber || cb.MpesaReceiptNumber !== verified.receipt ||
        !cb.Phone || normalizePhone(cb.Phone) !== normalizePhone(attempt.phone)) {
      return NextResponse.json({ error: "Payment details mismatch" }, { status: 400 });
    }
    await markPaid(order.id, verified.receipt ?? null, attempt.requestId);
    after(() => processOrderMailJobs(order.id));
  }
  return NextResponse.json({ success: true });
}

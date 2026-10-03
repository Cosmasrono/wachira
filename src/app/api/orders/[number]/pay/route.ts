import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { requestPayment } from "@/lib/orders";

/** Sends the M-Pesa prompt again, e.g. after a timeout or a cancelled prompt. */
export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) {
    return NextResponse.json({ error: "Enter the Safaricom number you'll pay from." }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { number } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const lastRequest = order.paymentRequestedAt?.getTime() ?? 0;
  const canRetry =
    order.status === "PAYMENT_FAILED" ||
    (order.status === "PENDING_PAYMENT" && Date.now() - lastRequest > 60_000);
  if (!canRetry) {
    return NextResponse.json(
      { error: "A prompt was sent less than a minute ago. Check your phone, or wait a moment and try again." },
      { status: 409 },
    );
  }

  const updated = await db.order.update({ where: { id: order.id }, data: { mpesaPhone: phone } });
  await requestPayment(updated);
  return NextResponse.json({ ok: true });
}

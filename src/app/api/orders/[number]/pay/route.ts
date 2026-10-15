import { NextResponse } from "next/server";
import { currentCustomer, ownsOrder } from "@/lib/customer";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { PaymentBusyError, requestPayment } from "@/lib/orders";

/** Sends the M-Pesa prompt again, e.g. after a timeout or a cancelled prompt. */
export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Please sign in to pay for this order." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { phone?: string };
  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) {
    return NextResponse.json({ error: "Enter the Safaricom number you'll pay from." }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { number } });
  if (!order || !ownsOrder(customer, order)) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.paymentMethod === "CASH") return NextResponse.json({ error: "This order is payable in cash on delivery or pickup." }, { status: 409 });

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

  try {
    await requestPayment({ ...order, mpesaPhone: phone });
  } catch (error) {
    if (error instanceof PaymentBusyError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
  return NextResponse.json({ ok: true });
}

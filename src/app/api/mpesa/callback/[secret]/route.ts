import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { friendlyResult } from "@/lib/mpesa";
import { markFailed, markPaid } from "@/lib/orders";

type CallbackItem = { Name: string; Value?: string | number };
type StkCallback = {
  CheckoutRequestID?: string;
  ResultCode?: number | string;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: CallbackItem[] };
};

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
  const cb: StkCallback | undefined = body?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return accepted;

  const order = await db.order.findUnique({ where: { checkoutRequestId: cb.CheckoutRequestID } });
  if (!order) return accepted;

  if (Number(cb.ResultCode) !== 0) {
    await markFailed(order.id, friendlyResult(cb.ResultCode, cb.ResultDesc));
    return accepted;
  }

  const items = cb.CallbackMetadata?.Item ?? [];
  const get = (name: string) => items.find((i) => i.Name === name)?.Value;
  const amount = Number(get("Amount") ?? 0);
  const receipt = get("MpesaReceiptNumber") ? String(get("MpesaReceiptNumber")) : null;

  if (amount < order.total) {
    const note = `Received KSh ${amount}, expected KSh ${order.total}. Check this payment manually.`;
    await db.order.update({ where: { id: order.id }, data: { status: "PAYMENT_FAILED", paymentNote: note } });
    await db.orderEvent.create({ data: { orderId: order.id, status: "PAYMENT_FAILED", note } });
    return accepted;
  }

  if (order.status === "PAID" && !order.mpesaReceipt && receipt) {
    // Already confirmed by a status query; store the receipt number.
    await db.order.update({ where: { id: order.id }, data: { mpesaReceipt: receipt } });
  } else {
    await markPaid(order.id, receipt);
  }
  return accepted;
}

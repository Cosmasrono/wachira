import { randomInt } from "node:crypto";
import { db } from "./db";
import { isMockPayments, MpesaError, stkPush, stkQuery } from "./mpesa";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

export function newOrderNumber() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `WCH-${s}`;
}

export async function markPaid(orderId: string, receipt: string | null) {
  const res = await db.order.updateMany({
    where: { id: orderId, status: { in: ["PENDING_PAYMENT", "PAYMENT_FAILED"] } },
    data: { status: "PAID", mpesaReceipt: receipt, paidAt: new Date(), paymentNote: null },
  });
  if (res.count) {
    await db.orderEvent.create({
      data: { orderId, status: "PAID", note: receipt ? `M-Pesa receipt ${receipt}` : "Payment confirmed" },
    });
  }
}

export async function markFailed(orderId: string, note: string) {
  const res = await db.order.updateMany({
    where: { id: orderId, status: "PENDING_PAYMENT" },
    data: { status: "PAYMENT_FAILED", paymentNote: note },
  });
  if (res.count) await db.orderEvent.create({ data: { orderId, status: "PAYMENT_FAILED", note } });
}

type Payable = { id: string; number: string; total: number; mpesaPhone: string };

/** Sends the M-Pesa prompt (STK push) to the customer's phone. */
export async function requestPayment(order: Payable) {
  const now = new Date();
  if (isMockPayments()) {
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "PENDING_PAYMENT",
        checkoutRequestId: `mock-${order.number}-${now.getTime()}`,
        paymentNote: null,
        paymentRequestedAt: now,
        paymentCheckedAt: now,
      },
    });
    return;
  }

  try {
    const { checkoutRequestId } = await stkPush({
      phone: order.mpesaPhone,
      amount: order.total,
      reference: order.number,
      description: "Wachira order",
    });
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "PENDING_PAYMENT",
        checkoutRequestId,
        paymentNote: null,
        paymentRequestedAt: now,
        paymentCheckedAt: now,
      },
    });
  } catch (e) {
    console.error("STK push failed", order.number, e);
    const note = "We couldn't send the M-Pesa prompt. Check the number and try again.";
    await db.order.update({
      where: { id: order.id },
      data: { status: "PAYMENT_FAILED", paymentNote: note, paymentRequestedAt: now },
    });
    await db.orderEvent.create({
      data: {
        orderId: order.id,
        status: "PAYMENT_FAILED",
        note: e instanceof MpesaError ? e.message : "M-Pesa could not be reached.",
      },
    });
  }
}

type Pending = {
  id: string;
  status: string;
  checkoutRequestId: string | null;
  paymentCheckedAt: Date | null;
};

/**
 * Backup for the M-Pesa callback: while the customer waits, ask Daraja
 * for the result at most every 15 seconds.
 */
export async function refreshPayment(order: Pending) {
  if (order.status !== "PENDING_PAYMENT" || !order.checkoutRequestId) return;
  const last = order.paymentCheckedAt?.getTime() ?? 0;

  if (order.checkoutRequestId.startsWith("mock-")) {
    if (Date.now() - last > 4000) await markPaid(order.id, `MOCK${randomInt(100000, 999999)}`);
    return;
  }

  if (Date.now() - last < 15_000) return;
  await db.order.update({ where: { id: order.id }, data: { paymentCheckedAt: new Date() } });
  const result = await stkQuery(order.checkoutRequestId).catch(() => null);
  if (result?.state === "paid") await markPaid(order.id, null); // receipt number arrives with the callback
  else if (result?.state === "failed") await markFailed(order.id, result.message);
}

import { randomBytes, randomInt } from "node:crypto";
import { db } from "./db";
import { isMockPayments, MpesaError, stkPush, stkQuery } from "./mpesa";
import { queueOrderPaidEmails } from "./order-mail";
import { paymentTransaction } from "./payment-transaction";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const unpaid = ["PENDING_PAYMENT", "PAYMENT_FAILED"];

export function newOrderNumber() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `WCH-${s}`;
}

export async function markPaid(orderId: string, receipt: string | null, requestId?: string) {
  await paymentTransaction(async (tx) => {
    if (requestId) await tx.paymentAttempt.updateMany({ where: { requestId, orderId }, data: { status: "PAID", receipt } });
    const res = await tx.order.updateMany({
      where: { id: orderId, status: { in: unpaid } },
      data: { status: "PAID", mpesaReceipt: receipt, paidAt: new Date(), paymentNote: null },
    });
    if (res.count) {
      await tx.orderEvent.create({ data: { orderId, status: "PAID", note: receipt ? `M-Pesa receipt ${receipt}` : "Payment confirmed" } });
      await queueOrderPaidEmails(tx, orderId);
    } else if (receipt) {
      await tx.order.updateMany({
        where: { id: orderId, paidAt: { not: null }, OR: [{ mpesaReceipt: null }, { mpesaReceipt: { isSet: false } }] },
        data: { mpesaReceipt: receipt },
      });
    }
  });
}

export async function markFailed(orderId: string, note: string, requestId: string) {
  await paymentTransaction(async (tx) => {
    await tx.paymentAttempt.updateMany({ where: { requestId, orderId, status: { not: "PAID" } }, data: { status: "FAILED" } });
    const res = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT", checkoutRequestId: requestId },
      data: { status: "PAYMENT_FAILED", paymentNote: note },
    });
    if (res.count) await tx.orderEvent.create({ data: { orderId, status: "PAYMENT_FAILED", note } });
  });
}

export class PaymentBusyError extends Error {}
type Payable = { id: string; number: string; total: number; mpesaPhone: string; paymentMethod?: string };

/** Claim a prompt before contacting PayHero. Never overwrite a confirmed payment. */
export async function requestPayment(order: Payable) {
  if (order.paymentMethod === "CASH") throw new PaymentBusyError("This order is payable in cash.");
  const now = new Date();
  const placeholder = `sending-${randomBytes(16).toString("hex")}`;
  const mock = isMockPayments();
  await db.$transaction(async (tx) => {
    const previous = await tx.order.findUnique({ where: { id: order.id } });
    const claim = await tx.order.updateMany({
      where: {
        id: order.id, status: { in: unpaid },
        OR: [{ paymentRequestedAt: null }, { paymentRequestedAt: { isSet: false } }, { paymentRequestedAt: { lt: new Date(now.getTime() - 60_000) } }],
      },
      data: { checkoutRequestId: placeholder, status: "PENDING_PAYMENT", mpesaPhone: order.mpesaPhone, paymentNote: null, paymentRequestedAt: now, paymentCheckedAt: now },
    });
    if (!claim.count) throw new PaymentBusyError("A prompt was sent recently or this order can no longer be paid. Refresh and try again in a minute.");
    // Retain references from orders created before PaymentAttempt was introduced.
    if (previous?.checkoutRequestId && !previous.checkoutRequestId.startsWith("sending-")) {
      await tx.paymentAttempt.upsert({
        where: { requestId: previous.checkoutRequestId }, update: {},
        create: { requestId: previous.checkoutRequestId, orderId: order.id, amount: previous.total, phone: previous.mpesaPhone },
      });
    }
    await tx.paymentAttempt.create({ data: { requestId: placeholder, orderId: order.id, amount: order.total, phone: order.mpesaPhone } });
  });

  let requestId: string;
  let providerReference: string | undefined;
  try {
    const response = mock ? { checkoutRequestId: `mock-${randomBytes(16).toString("hex")}`, providerReference: undefined } : await stkPush({
      phone: order.mpesaPhone, amount: order.total, reference: order.number, description: "Wachira order",
    });
    requestId = response.checkoutRequestId;
    providerReference = response.providerReference;
  } catch (e) {
    console.error("STK push failed", order.number, e);
    await markFailed(order.id, e instanceof MpesaError ? e.message : "We couldn't send the M-Pesa prompt. Please try again.", placeholder);
    return;
  }
  // A database failure after a successful prompt is not a failed payment.
  await db.$transaction(async (tx) => {
    await tx.paymentAttempt.update({ where: { requestId: placeholder }, data: { requestId, providerReference } });
    await tx.order.updateMany({
      where: { id: order.id, checkoutRequestId: placeholder, status: { in: unpaid } },
      data: { checkoutRequestId: requestId },
    });
  });
}

export async function findPaymentOrder(requestId: string) {
  const attempt = await db.paymentAttempt.findUnique({ where: { requestId } });
  return attempt ? db.order.findUnique({ where: { id: attempt.orderId } }) : db.order.findUnique({ where: { checkoutRequestId: requestId } });
}

type Pending = { id: string; status: string; checkoutRequestId: string | null; paymentCheckedAt: Date | null; paymentMethod?: string };

export async function refreshPayment(order: Pending) {
  if (order.paymentMethod === "CASH") return;
  if (!unpaid.includes(order.status)) return;
  const attempts = await db.paymentAttempt.findMany({ where: { orderId: order.id, status: "PENDING" } });
  if (order.checkoutRequestId && !attempts.some((a) => a.requestId === order.checkoutRequestId)) {
    const legacy = await db.order.findUnique({ where: { id: order.id } });
    if (legacy && !order.checkoutRequestId.startsWith("sending-")) {
      const attempt = await db.paymentAttempt.upsert({
        where: { requestId: order.checkoutRequestId }, update: {},
        create: { orderId: order.id, requestId: order.checkoutRequestId, amount: legacy.total, phone: legacy.mpesaPhone, checkedAt: order.paymentCheckedAt ?? new Date(0) },
      });
      if (attempt.status === "PENDING") attempts.push(attempt);
    }
  }
  for (const attempt of attempts) {
    if (attempt.requestId.startsWith("sending-")) continue;
    const claim = await db.paymentAttempt.updateMany({
      where: { id: attempt.id, status: "PENDING", checkedAt: { lt: new Date(Date.now() - 15_000) } },
      data: { checkedAt: new Date() },
    });
    if (!claim.count) continue;
    if (attempt.requestId.startsWith("mock-")) {
      if (isMockPayments() && Date.now() - attempt.createdAt.getTime() > 4000) await markPaid(order.id, `MOCK${randomInt(100000, 999999)}`, attempt.requestId);
      continue;
    }
    const result = await stkQuery(attempt.requestId, attempt.providerReference).catch(() => null);
    if (result?.state === "paid") await markPaid(order.id, result.receipt ?? null, attempt.requestId);
    else if (result?.state === "failed") await markFailed(order.id, result.message, attempt.requestId);
  }
}

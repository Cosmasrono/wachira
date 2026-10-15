export const STATUS = {
  CASH_PENDING: "Order placed · cash due",
  PENDING_PAYMENT: "Awaiting payment",
  PAYMENT_FAILED: "Payment failed",
  PAID: "Paid",
  SEWING: "Sewing",
  READY: "Ready for pick up",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
} as const;

export type OrderStatus = keyof typeof STATUS;

export const isStatus = (s: string): s is OrderStatus => s in STATUS;

type FlowInput = { status: string; hasCustom: boolean; deliveryMethod: string; paymentMethod?: string };

/** Cash orders are prepared before payment is collected at handover. */
export function flow(o: Omit<FlowInput, "status">): OrderStatus[] {
  return [
    o.paymentMethod === "CASH" ? "CASH_PENDING" : "PAID",
    ...(o.hasCustom ? (["SEWING"] as const) : []),
    o.deliveryMethod === "PICKUP" ? "READY" : "DISPATCHED",
    ...(o.paymentMethod === "CASH" ? (["PAID"] as const) : []),
    "DELIVERED",
  ];
}

export function statusLabel(status: string, deliveryMethod?: string) {
  if (status === "DELIVERED" && deliveryMethod === "PICKUP") return "Collected";
  return isStatus(status) ? STATUS[status] : status;
}

/** Statuses the admin can move an order to next. */
export function nextActions(o: FlowInput): OrderStatus[] {
  if (o.status === "CANCELLED" || o.status === "DELIVERED") return [];
  const steps = flow(o);
  const i = steps.indexOf(o.status as OrderStatus);
  const next = i === -1 ? "PAID" : steps[i + 1];
  return next ? [next, "CANCELLED"] : ["CANCELLED"];
}

/** Tracker shown to the customer. */
export function trackerSteps(o: FlowInput) {
  const steps = flow(o);
  const i = steps.indexOf(o.status as OrderStatus);
  return steps.map((s, k) => ({
    status: s,
    label: statusLabel(s, o.deliveryMethod),
    done: i >= 0 && k <= i,
    current: k === i,
  }));
}

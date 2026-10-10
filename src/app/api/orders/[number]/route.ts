import { after, NextResponse } from "next/server";
import { currentCustomer, ownsOrder } from "@/lib/customer";
import { db } from "@/lib/db";
import { refreshPayment } from "@/lib/orders";
import { processOrderMailJobs } from "@/lib/order-mail";

export const dynamic = "force-dynamic";

/** Polled by the order page while the customer confirms on their phone. */
export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  let order = await db.order.findUnique({ where: { number } });
  if (!order || !ownsOrder(customer, order)) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(order.status)) {
    await refreshPayment(order);
    order = (await db.order.findUnique({ where: { number } }))!;
  }

  const orderId = order.id;
  after(() => processOrderMailJobs(orderId));
  return NextResponse.json({ status: order.status, paymentNote: order.paymentNote });
}

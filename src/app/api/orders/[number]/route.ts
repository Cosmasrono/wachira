import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { refreshPayment } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Polled by the order page while the customer confirms on their phone. */
export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  let order = await db.order.findUnique({ where: { number } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (order.status === "PENDING_PAYMENT") {
    await refreshPayment(order);
    order = (await db.order.findUnique({ where: { number } }))!;
  }

  return NextResponse.json({ status: order.status, paymentNote: order.paymentNote });
}

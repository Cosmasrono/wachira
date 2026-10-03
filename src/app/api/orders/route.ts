import { NextResponse } from "next/server";
import { currentCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { newOrderNumber, requestPayment } from "@/lib/orders";
import { priceOrder, PricingError } from "@/lib/pricing";
import { orderInput } from "@/lib/validation";

export async function POST(req: Request) {
  const customer = await currentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Please sign in to place your order." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = orderInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check your details and try again." },
      { status: 400 },
    );
  }
  const v = parsed.data;

  try {
    const priced = await priceOrder(v.items, v.deliveryMethod);
    const pickup = v.deliveryMethod === "PICKUP";

    const order = await db.order.create({
      data: {
        number: newOrderNumber(),
        customerName: v.customerName,
        customerUid: customer.uid,
        customerEmail: customer.email,
        phone: normalizePhone(v.phone)!,
        mpesaPhone: normalizePhone(v.mpesaPhone)!,
        deliveryMethod: v.deliveryMethod,
        county: pickup ? "" : v.county,
        area: pickup ? "" : v.area,
        notes: v.notes,
        subtotal: priced.subtotal,
        deliveryFee: priced.deliveryFee,
        total: priced.total,
        hasCustom: priced.hasCustom,
        items: { create: priced.lines },
        events: { create: { status: "PENDING_PAYMENT", note: "Order placed" } },
      },
    });

    await requestPayment(order);
    return NextResponse.json({ number: order.number });
  } catch (e) {
    if (e instanceof PricingError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error("Create order failed", e);
    return NextResponse.json(
      { error: "We couldn't place your order. Please try again." },
      { status: 500 },
    );
  }
}

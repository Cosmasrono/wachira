import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PaymentWatcher from "@/components/PaymentWatcher";
import { CUSTOM_LEAD_TIME, deliveryLabel } from "@/lib/config";
import { ownsOrder, requireCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { displayPhone, ksh } from "@/lib/format";
import { statusLabel, trackerSteps } from "@/lib/order-status";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your order", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const customer = await requireCustomer(`/orders/${number}`);
  const order = await db.order.findUnique({ where: { number }, include: { items: true } });
  // Someone else's order looks the same as a missing one, so order numbers can't be probed.
  if (!order || !ownsOrder(customer, order)) notFound();

  const pickup = order.deliveryMethod === "PICKUP";
  const paid = !!order.paidAt;
  const cash = order.paymentMethod === "CASH";
  const steps = trackerSteps(order);

  return (
    <section className="first order">
      <div className="order-head">
        <p className="label">Order number</p>
        <h1 className="ono">{order.number}</h1>
        <span className="pill" data-s={order.status}>{statusLabel(order.status, order.deliveryMethod)}</span>
      </div>

      {!cash && <PaymentWatcher
        number={order.number}
        status={order.status}
        paymentNote={order.paymentNote}
        mpesaPhone={displayPhone(order.mpesaPhone)}
      />}
      {cash && !paid && order.status !== "CANCELLED" && <div className="pay-box waiting"><b>Your order is placed</b><p>Pay {ksh(order.total)} in cash {pickup ? "when you collect your order" : "when your order is delivered"}. No M-Pesa payment is needed.</p></div>}

      {paid && order.status !== "CANCELLED" && (
        <p>
          Thanks, {order.customerName.split(" ")[0]}. Your payment is confirmed
          {order.mpesaReceipt ? ` (M-Pesa ${order.mpesaReceipt})` : ""}. Keep this page to track your order.
        </p>
      )}

      {order.status !== "CANCELLED" && (
        <ol className="track" aria-label="Order progress">
          {steps.map((s) => (
            <li key={s.status} className={s.done ? "done" : ""} aria-current={s.current ? "step" : undefined}>
              <i />
              <span>
                {s.label}
                {s.status === "SEWING" && <small>Made-to-measure pieces take {CUSTOM_LEAD_TIME}</small>}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="order-grid">
        <div>
          <h2>Items</h2>
          {order.items.map((item) => {
            const m = item.measurements ? (JSON.parse(item.measurements) as Record<string, number>) : null;
            return (
              <div className="line plain" key={item.id}>
                <div>
                  <b>{item.name}</b>
                  <small>
                    {m ? `Made to measure: ${Object.entries(m).map(([k, v]) => `${k} ${v}cm`).join(", ")}` : `Size ${item.size}`}
                    {" "}· Qty {item.qty}
                  </small>
                </div>
                <span className="price">{ksh(item.unitPrice * item.qty)}</span>
              </div>
            );
          })}
          <div className="row"><span>Subtotal</span><span className="price">{ksh(order.subtotal)}</span></div>
          <div className="row"><span>Delivery</span><span className="price">{order.deliveryFee ? ksh(order.deliveryFee) : "Free"}</span></div>
          <div className="row total"><span>Total</span><span className="price">{ksh(order.total)}</span></div>
        </div>
        <div>
          <h2>Delivery</h2>
          <p>
            {deliveryLabel(order.deliveryMethod)}
            <br />
            {pickup ? "We'll text you when it's ready to collect." : `${order.area}, ${order.county}`}
          </p>
          <p className="hint">Questions? WhatsApp us with your order number.</p>
        </div>
      </div>
    </section>
  );
}

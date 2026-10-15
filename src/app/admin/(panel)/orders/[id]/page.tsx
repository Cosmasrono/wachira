import Link from "next/link";
import { notFound } from "next/navigation";
import { DELIVERY, type DeliveryMethod } from "@/lib/config";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { displayPhone, formatDate, ksh } from "@/lib/format";
import { nextActions, statusLabel } from "@/lib/order-status";
import { updateOrderStatus } from "../../../actions";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, events: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) notFound();

  const actions = nextActions(order);
  const waText = encodeURIComponent(`Hi ${order.customerName.split(" ")[0]}, this is Wachira about your order ${order.number}.`);

  return (
    <>
      <p><Link href="/admin/orders" className="back">← All orders</Link></p>
      <div className="admin-head">
        <h1 className="mono">{order.number}</h1>
        <span className="pill" data-s={order.status}>{statusLabel(order.status, order.deliveryMethod)}</span>
      </div>

      {actions.length > 0 && (
        <div className="panel">
          <h2>Review &amp; update order</h2>
          <form action={updateOrderStatus} className="status-form">
            <input type="hidden" name="id" value={order.id} />
            <label htmlFor="note">Note (optional, e.g. rider name or courier tracking number)
              <input id="note" name="note" />
            </label>
            <div className="cta-row">
              {actions.map((s) => (
                <button key={s} name="status" value={s} className={s === "CANCELLED" ? "btn danger" : "btn primary"}>
                  {s === "CANCELLED" ? "Cancel order" : s === "PAID" ? (order.paymentMethod === "CASH" ? "Confirm cash received" : "Verify payment & mark paid") : `Mark as ${statusLabel(s, order.deliveryMethod).toLowerCase()}`}
                </button>
              ))}
            </div>
            {(order.status === "PENDING_PAYMENT" || order.status === "PAYMENT_FAILED") && (
              <p className="hint">Only mark as paid after you&apos;ve checked the payment in your M-Pesa statement.</p>
            )}
          </form>
        </div>
      )}

      <div className="admin-grid">
        <div className="panel">
          <h2>Items</h2>
          {order.items.map((item) => {
            const m = item.measurements ? (JSON.parse(item.measurements) as Record<string, number>) : null;
            return (
              <div key={item.id} className="item">
                <div className="row">
                  <b>{item.name} × {item.qty}</b>
                  <span className="price">{ksh(item.unitPrice * item.qty)}</span>
                </div>
                {m ? (
                  <>
                    <p className="label">Made to measure (cm)</p>
                    <dl className="measures">
                      {Object.entries(m).map(([k, v]) => (
                        <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                      ))}
                    </dl>
                    {item.fitNote && <p className="note">Fit notes: {item.fitNote}</p>}
                  </>
                ) : (
                  <p className="hint">Size {item.size}</p>
                )}
              </div>
            );
          })}
          <div className="row"><span>Subtotal</span><span className="price">{ksh(order.subtotal)}</span></div>
          <div className="row"><span>Delivery</span><span className="price">{ksh(order.deliveryFee)}</span></div>
          <div className="row total"><span>Total</span><span className="price">{ksh(order.total)}</span></div>
        </div>

        <div className="stack">
          <div className="panel">
            <h2>Customer</h2>
            <p><b>{order.customerName}</b><br />{displayPhone(order.phone)}</p>
            <p>
              <a className="btn" href={`https://wa.me/${order.phone}?text=${waText}`} target="_blank" rel="noopener noreferrer">
                WhatsApp customer
              </a>
            </p>
            <h3>Delivery</h3>
            <p>
              {DELIVERY[order.deliveryMethod as DeliveryMethod]?.label ?? order.deliveryMethod}
              {order.deliveryMethod !== "PICKUP" && <><br />{order.area}, {order.county}</>}
            </p>
            {order.notes && <p className="note">{order.notes}</p>}
          </div>

          <div className="panel">
            <h2>Payment</h2>
            <p>Method: {order.paymentMethod === "CASH" ? "Cash" : "M-Pesa"}</p>
            {order.paymentMethod === "CASH" && !order.paidAt && <p className="hint">Cash due: {ksh(order.total)}. Confirm payment only after receiving the cash.</p>}
            <p>
              {order.paymentMethod !== "CASH" && <>M-Pesa number: {displayPhone(order.mpesaPhone)}
              <br />Receipt: <span className="mono">{order.mpesaReceipt ?? "—"}</span></>}
              {order.paidAt && <><br />Paid: {formatDate(order.paidAt)}</>}
            </p>
            {order.paymentNote && <p className="note">{order.paymentNote}</p>}
          </div>

          <div className="panel">
            <h2>History</h2>
            <ol className="history">
              {order.events.map((e) => (
                <li key={e.id}>
                  <b>{statusLabel(e.status, order.deliveryMethod)}</b>
                  <small>{formatDate(e.createdAt)}{e.note ? ` · ${e.note}` : ""}</small>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}

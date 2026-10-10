// Emails sent when an order is paid: a receipt for the customer and a new-order alert for staff.

import { CUSTOM_LEAD_TIME, DELIVERY, SITE, type DeliveryMethod } from "./config";
import { db, type Prisma } from "./db";
import { displayPhone, ksh } from "./format";
import { mailConfigured, sendMail } from "./mail";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const staffEmails = () =>
  (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);

const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Called in the same transaction as payment confirmation. */
export async function queueOrderPaidEmails(tx: Prisma.TransactionClient, orderId: string) {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const recipients = [
    ...(order.customerEmail ? [{ recipient: order.customerEmail, kind: "customer" }] : []),
    ...staffEmails().map((recipient) => ({ recipient, kind: "staff" })),
  ];
  for (const { recipient, kind } of recipients) {
    const key = `${orderId}:${kind}:${recipient.toLowerCase()}`;
    await tx.orderMailJob.upsert({ where: { key }, update: {}, create: { key, orderId, recipient, kind } });
  }
}

/** A scheduled worker retries each recipient independently. SMTP delivery is at-least-once. */
export async function processOrderMailJobs(orderId?: string) {
  const pending = { OR: [{ sentAt: null }, { sentAt: { isSet: false } }] };
  const jobs = await db.orderMailJob.findMany({
    where: { ...pending, ...(orderId ? { orderId } : {}), availableAt: { lte: new Date() } }, orderBy: { availableAt: "asc" }, take: 20,
  });
  let sent = 0;
  for (const job of jobs) {
    const claim = await db.orderMailJob.updateMany({
      where: { id: job.id, ...pending, availableAt: { lte: new Date() } },
      data: { availableAt: new Date(Date.now() + 5 * 60_000), attempts: { increment: 1 } },
    });
    if (!claim.count) continue;
    try {
      await sendOrderPaidEmail(job.orderId, job.recipient, job.kind);
      await db.orderMailJob.update({ where: { id: job.id }, data: { sentAt: new Date() } });
      sent++;
    } catch {
      console.error("[order-mail] delivery failed for job", job.id);
      await db.orderMailJob.update({ where: { id: job.id }, data: {
        availableAt: new Date(Date.now() + Math.min(3600_000, 60_000 * 2 ** Math.min(job.attempts, 6))),
      } });
    }
  }
  return { processed: jobs.length, sent };
}

async function sendOrderPaidEmail(orderId: string, recipient: string, kind: string) {
  try {
    const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new Error("Order not found");
    if (!mailConfigured()) {
      throw new Error("Mail is not configured");
    }

    const delivery = DELIVERY[order.deliveryMethod as DeliveryMethod]?.label ?? order.deliveryMethod;
    const where = order.deliveryMethod === "PICKUP" ? delivery : `${delivery}: ${order.area}, ${order.county}`;
    const itemText = order.items.map((i) => {
      const fit = i.custom ? "Made to measure" : `Size ${i.size}`;
      return `${i.name} (${fit}) x${i.qty} - ${ksh(i.unitPrice * i.qty)}`;
    });
    const itemRows = order.items.map((i) => {
      const fit = i.custom ? "Made to measure" : `Size ${esc(i.size)}`;
      return `<tr><td style="padding:6px 0">${esc(i.name)}<br><small style="color:#666">${fit} &middot; Qty ${i.qty}</small></td>` +
        `<td style="padding:6px 0;text-align:right">${ksh(i.unitPrice * i.qty)}</td></tr>`;
    }).join("");
    const totals =
      `<tr><td style="padding:6px 0;border-top:1px solid #eee">Delivery</td><td style="text-align:right;border-top:1px solid #eee">${order.deliveryFee ? ksh(order.deliveryFee) : "Free"}</td></tr>` +
      `<tr><td style="padding:6px 0"><b>Total paid</b></td><td style="text-align:right"><b>${ksh(order.total)}</b></td></tr>`;
    const table = `<table style="width:100%;border-collapse:collapse;font-size:14px">${itemRows}${totals}</table>`;
    const receipt = order.mpesaReceipt ? ` (M-Pesa ${order.mpesaReceipt})` : "";
    const sewing = order.hasCustom ? `Made-to-measure pieces take ${CUSTOM_LEAD_TIME} to sew before they are sent.` : "";

    const mails: Promise<unknown>[] = [];

    if (kind === "customer") {
      const link = `${appUrl()}/orders/${order.number}`;
      const first = order.customerName.split(" ")[0];
      mails.push(sendMail(
        recipient,
        `Order ${order.number} confirmed - thank you!`,
        [
          `Hi ${first},`, "",
          `We've received your payment of ${ksh(order.total)}${receipt} for order ${order.number}.`, "",
          ...itemText, "",
          `Delivery: ${where}`, ...(sewing ? [sewing] : []), "",
          `Track your order: ${link}`,
          `Questions? WhatsApp us on ${displayPhone(SITE.whatsapp)} with your order number.`,
        ].join("\n"),
        `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#142843">
          <h2 style="margin-top:0">Thank you, ${esc(first)}!</h2>
          <p>We've received your payment${esc(receipt)} for order <b>${order.number}</b>.</p>
          ${table}
          <p style="margin-top:20px"><b>Delivery:</b> ${esc(where)}</p>
          ${sewing ? `<p>${sewing}</p>` : ""}
          <p><a href="${link}" style="display:inline-block;background:#245dcc;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Track your order</a></p>
          <p style="font-size:13px;color:#666">Questions? WhatsApp us on ${displayPhone(SITE.whatsapp)} with your order number.</p>
        </div>`,
      ));
    }

    if (kind === "staff") {
      const link = `${appUrl()}/admin/orders/${order.id}`;
      mails.push(sendMail(
        recipient,
        `New paid order ${order.number} - ${ksh(order.total)}${order.hasCustom ? " (made to measure)" : ""}`,
        [
          `${order.customerName} - ${displayPhone(order.phone)}`,
          where, order.notes ? `Notes: ${order.notes}` : "", "",
          ...itemText, `Total ${ksh(order.total)}${receipt}`, "",
          `Open in admin: ${link}`,
        ].filter(Boolean).join("\n"),
        `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#142843">
          <h2 style="margin-top:0">New paid order ${order.number}</h2>
          <p><b>${esc(order.customerName)}</b> &middot; ${displayPhone(order.phone)}<br>${esc(where)}</p>
          ${order.notes ? `<p><b>Notes:</b> ${esc(order.notes)}</p>` : ""}
          ${order.hasCustom ? `<p><b>Contains made-to-measure items</b> &mdash; measurements are in the admin.</p>` : ""}
          ${table}
          <p><a href="${link}" style="display:inline-block;background:#245dcc;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Open in admin</a></p>
        </div>`,
      ));
    }

    await Promise.all(mails);
  } catch (e) {
    throw e;
  }
}

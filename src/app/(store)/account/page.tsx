import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCustomer, safeNext } from "@/lib/customer";
import { db } from "@/lib/db";
import { formatDate, ksh } from "@/lib/format";
import { statusLabel } from "@/lib/order-status";
import { logoutCustomerAction } from "../auth-actions";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  const customer = await currentCustomer();

  if (!customer) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // Fetch customer's orders
  const orders = await db.order.findMany({
    where: {
      OR: [
        { customerUid: customer.uid },
        { customerEmail: customer.email },
      ],
    },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <section className="first wrap" style={{ paddingBottom: 64 }}>
      <div className="sec-head">
        <div>
          <p className="label">Customer Account</p>
          <h1>Welcome, {customer.name || customer.email.split("@")[0]}</h1>
        </div>
        <form action={logoutCustomerAction}>
          <button className="btn" type="submit">Sign out</button>
        </form>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBlock: "24px 48px" }}>
        <div style={{ border: "1px solid var(--line)", padding: 20, background: "var(--surface)" }}>
          <p className="label">Profile Information</p>
          <p style={{ margin: "4px 0", fontWeight: 600 }}>{customer.name || "Customer"}</p>
          <p style={{ color: "var(--muted)", margin: 0 }}>{customer.email}</p>
        </div>

        <div style={{ border: "1px solid var(--line)", padding: 20, background: "var(--surface)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <p className="label">Quick Actions</p>
            <p style={{ margin: 0, color: "var(--muted)" }}>Explore new arrivals or customize your measurements.</p>
          </div>
          <div style={{ marginTop: 16 }}>
            <Link className="btn primary" href="/shop">Browse collection ↗</Link>
          </div>
        </div>
      </div>

      <div>
        <div className="sec-head">
          <h2>Your Orders</h2>
        </div>

        {orders.length === 0 ? (
          <div style={{ border: "1px solid var(--line)", padding: "32px 24px", background: "var(--surface)", textAlign: "center" }}>
            <p style={{ margin: "0 0 16px", color: "var(--muted)" }}>You haven&apos;t placed any orders yet.</p>
            <Link className="btn primary" href="/shop">Start shopping</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Delivery</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orders/${o.number}`} className="mono" style={{ textDecoration: "underline" }}>
                        {o.number}
                      </Link>
                    </td>
                    <td>{formatDate(o.createdAt)}</td>
                    <td>
                      {o._count.items}
                      {o.hasCustom && <span className="custom-tag">Custom</span>}
                    </td>
                    <td>{o.deliveryMethod === "PICKUP" ? "Nairobi CBD" : o.county}</td>
                    <td className="num price">{ksh(o.total)}</td>
                    <td>
                      <span className="pill" data-s={o.status}>
                        {statusLabel(o.status, o.deliveryMethod)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

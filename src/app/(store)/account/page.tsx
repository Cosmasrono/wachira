import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentCustomer, safeNext } from "@/lib/customer";
import { db } from "@/lib/db";
import { formatDate, ksh } from "@/lib/format";
import { statusLabel } from "@/lib/order-status";
import { logoutCustomerAction } from "../auth-actions";
import {
  User,
  ShoppingBag,
  Ruler,
  LogOut,
  ArrowRight,
  Package,
  Sparkles,
  ChevronRight
} from "lucide-react";

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
    include: {
      _count: { select: { items: true } },
      items: { select: { measurements: true, custom: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  // Extract latest custom measurements if any exist in past orders
  let latestMeasurements: Record<string, number | string> | null = null;
  for (const o of orders) {
    for (const item of o.items) {
      if (item.custom && item.measurements) {
        try {
          latestMeasurements = JSON.parse(item.measurements);
          break;
        } catch {
          // ignore parsing error
        }
      }
    }
    if (latestMeasurements) break;
  }

  const customerInitial = (customer.name || customer.email || "C").charAt(0).toUpperCase();

  return (
    <section className="first account-overview-wrap">
      {/* Account Header */}
      <div className="account-hero-bar">
        <div className="account-user-meta">
          <div className="account-avatar">{customerInitial}</div>
          <div>
            <span className="account-badge">
              <Sparkles size={12} className="text-gold" /> Wachira Client
            </span>
            <h1>Welcome, {customer.name || customer.email.split("@")[0]}</h1>
            <p className="account-sub">{customer.email}</p>
          </div>
        </div>
        <form action={logoutCustomerAction}>
          <button className="btn ghost sm flex items-center gap-2" type="submit">
            <LogOut size={16} /> Sign out
          </button>
        </form>
      </div>

      {/* Account Cards Grid */}
      <div className="account-cards-grid">
        {/* Profile Card */}
        <div className="account-card">
          <div className="account-card-header">
            <User size={18} className="text-accent" />
            <h3>Profile Details</h3>
          </div>
          <div className="account-card-body">
            <p className="meta-label">Full Name</p>
            <p className="meta-value">{customer.name || "Customer"}</p>
            <p className="meta-label mt-2">Email Address</p>
            <p className="meta-value">{customer.email}</p>
          </div>
        </div>

        {/* Tailoring & Measurements Card */}
        <div className="account-card">
          <div className="account-card-header">
            <Ruler size={18} className="text-accent" />
            <h3>Tailoring Profile</h3>
          </div>
          <div className="account-card-body">
            {latestMeasurements ? (
              <div>
                <p className="hint mb-2">Saved measurements from your recent order:</p>
                <div className="measurements-pill-grid">
                  {Object.entries(latestMeasurements).map(([key, val]) => (
                    <span key={key} className="measure-pill">
                      <b>{key}:</b> {String(val)} cm
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="hint mb-3">
                  No bespoke measurements recorded yet. Customize any outfit to your exact measurements at checkout.
                </p>
                <Link href="/shop?fit=custom" className="text-link flex items-center gap-1 font-medium">
                  Learn about Made-to-Measure <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="account-card">
          <div className="account-card-header">
            <ShoppingBag size={18} className="text-accent" />
            <h3>Explore &amp; Order</h3>
          </div>
          <div className="account-card-body flex-between-col">
            <p className="hint">
              Discover our newest suits, matching sets, and seasonal kitenge collections.
            </p>
            <Link className="btn primary sm mt-3 flex items-center justify-center gap-2" href="/shop">
              Browse collection <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="account-orders-section">
        <div className="sec-head">
          <div>
            <p className="label">Order History</p>
            <h2>Your Orders</h2>
          </div>
          {orders.length > 0 && (
            <span className="orders-count-badge">
              {orders.length} {orders.length === 1 ? "order" : "orders"} placed
            </span>
          )}
        </div>

        {orders.length === 0 ? (
          <div className="account-orders-empty">
            <Package size={44} className="text-muted mb-2" />
            <h3>No orders yet</h3>
            <p className="hint">You haven&apos;t placed any orders yet. Discover your next tailored piece.</p>
            <Link className="btn primary mt-3" href="/shop">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-wrap desktop-only">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order No.</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Delivery</th>
                    <th className="num">Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/orders/${o.number}`} className="mono font-semibold hover-underline">
                          {o.number}
                        </Link>
                      </td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>
                        {o._count.items} {o._count.items === 1 ? "item" : "items"}
                        {o.hasCustom && <span className="custom-tag">Custom</span>}
                      </td>
                      <td>{o.deliveryMethod === "PICKUP" ? "Pickup" : o.county || "Kenya"}</td>
                      <td className="num price font-semibold">{ksh(o.total)}</td>
                      <td>
                        <span className="pill" data-s={o.status}>
                          {statusLabel(o.status, o.deliveryMethod)}
                        </span>
                      </td>
                      <td>
                        <Link href={`/orders/${o.number}`} className="btn ghost sm table-view-btn">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Order Cards View */}
            <div className="mobile-orders-list mobile-only">
              {orders.map((o) => (
                <Link key={o.id} href={`/orders/${o.number}`} className="mobile-order-card">
                  <div className="mobile-order-top">
                    <div>
                      <span className="mono font-bold">{o.number}</span>
                      <small className="block text-muted">{formatDate(o.createdAt)}</small>
                    </div>
                    <span className="pill" data-s={o.status}>
                      {statusLabel(o.status, o.deliveryMethod)}
                    </span>
                  </div>
                  <div className="mobile-order-mid">
                    <span>
                      {o._count.items} {o._count.items === 1 ? "item" : "items"}
                      {o.hasCustom && <span className="custom-tag">Custom</span>}
                    </span>
                    <b className="price">{ksh(o.total)}</b>
                  </div>
                  <div className="mobile-order-bottom">
                    <span className="text-muted text-xs">
                      {o.deliveryMethod === "PICKUP" ? "Pickup" : o.county || "Delivery"}
                    </span>
                    <span className="view-link text-xs flex items-center gap-1 font-semibold text-accent">
                      Track order <ChevronRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

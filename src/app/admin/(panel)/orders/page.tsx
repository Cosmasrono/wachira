import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { displayPhone, formatDate, ksh } from "@/lib/format";
import { isStatus, STATUS, statusLabel } from "@/lib/order-status";

type Props = { searchParams: Promise<{ status?: string }> };

// Orders that need someone to act on them.
const TO_DO = ["CASH_PENDING", "PAID", "SEWING", "READY", "DISPATCHED"];

export default async function AdminOrders({ searchParams }: Props) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = status === "todo" ? "todo" : status && isStatus(status) ? status : "all";

  const [orders, counts] = await Promise.all([
    db.order.findMany({
      where:
        filter === "todo" ? { status: { in: TO_DO } } : filter === "all" ? {} : { status: filter },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } },
      take: 200,
    }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const todo = TO_DO.reduce((n, s) => n + count(s), 0);

  const tabs: [string, string, number | null][] = [
    ["todo", "To do", todo],
    ["all", "All", null],
    ...Object.entries(STATUS).map(([k, label]) => [k, label, count(k)] as [string, string, number]),
  ];

  return (
    <>
      <div className="admin-head"><h1>Orders</h1></div>
      <nav className="chips" aria-label="Filter orders">
        {tabs.map(([key, label, n]) => (
          <Link key={key} className="chip" href={`/admin/orders?status=${key}`} aria-current={filter === key ? "page" : undefined}>
            {label}{n !== null ? ` (${n})` : ""}
          </Link>
        ))}
      </nav>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Order</th><th>Placed</th><th>Customer</th><th>Items</th><th>Delivery</th><th className="num">Total</th><th>Status</th></tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan={7} className="empty">No orders here.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="mono">{o.number}</Link></td>
                <td>{formatDate(o.createdAt)}</td>
                <td>{o.customerName}<small>{displayPhone(o.phone)}</small></td>
                <td>{o._count.items}{o.hasCustom && <span className="custom-tag">Custom</span>}</td>
                <td>{o.deliveryMethod === "PICKUP" ? "Pick up" : o.county}<small>{o.paymentMethod === "CASH" ? "Cash" : "M-Pesa"}</small></td>
                <td className="num price">{ksh(o.total)}</td>
                <td><span className="pill" data-s={o.status}>{statusLabel(o.status, o.deliveryMethod)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

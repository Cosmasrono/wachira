import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { logout } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="admin">
      <aside className="admin-nav">
        <Link href="/admin/orders" className="logo">Wachira</Link>
        <nav>
          <Link href="/admin/orders">Orders</Link>
          <Link href="/admin/products">Products</Link>
          <Link href="/" target="_blank">View shop ↗</Link>
        </nav>
        <form action={logout} className="admin-user">
          <small>{admin.name ?? admin.email}</small>
          <button className="linkish">Log out</button>
        </form>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}

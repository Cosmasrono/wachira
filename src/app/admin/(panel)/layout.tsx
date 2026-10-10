import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { logout } from "../actions";
import { ExternalLink, LogOut, Package, ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="admin">
      <aside className="admin-nav">
        <Link href="/admin" className="logo">Wachira</Link>
        <nav>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/orders" className="flex items-center gap-2">
            <ShoppingCart size={16} /> Orders
          </Link>
          <Link href="/admin/products" className="flex items-center gap-2">
            <Package size={16} /> Products &amp; samples
          </Link>
          <Link href="/" target="_blank" className="flex items-center gap-2">
            <ExternalLink size={16} /> View shop
          </Link>
        </nav>
        <form action={logout} className="admin-user">
          <small>{admin.name ?? admin.email}</small>
          <button className="linkish flex items-center gap-1">
            <LogOut size={13} /> Log out
          </button>
        </form>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}

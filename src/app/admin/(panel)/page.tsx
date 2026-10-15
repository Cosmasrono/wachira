import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { SITE } from "@/lib/config";

export default async function AdminHome() {
  await requireAdmin();
  const [total, published] = await Promise.all([
    db.product.count(), db.product.count({ where: { active: true } }),
  ]);
  const whatsappReady = /^\d{10,15}$/.test(SITE.whatsapp);
  return <>
    <div className="admin-head"><div><p className="label">Wachira admin</p><h1>Manage your catalogue</h1></div><Link className="btn primary" href="/admin/products/new">Add a photo or sample</Link></div>
    <p>Upload your designs, add their details and choose which samples customers can see.</p>
    <div className="admin-grid">
      <section className="panel"><h2>Photos &amp; samples</h2><p><b>{published}</b> published · <b>{total - published}</b> hidden</p><p>Edit photos, descriptions, available sizes and prices.</p><Link className="btn primary" href="/admin/products">Manage catalogue</Link></section>
      <section className="panel"><h2>WhatsApp consultations</h2><p>{whatsappReady ? `Customer enquiries go to +${SITE.whatsapp}.` : "Your customer WhatsApp number still needs to be connected."}</p><p>Discuss fabric, fit, availability and delivery directly with each customer.</p>{whatsappReady && <a className="btn" href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer">Open WhatsApp</a>}</section>
      <section className="panel"><h2>Preview your shop</h2><p>Check how your published photos and samples appear to customers.</p><Link className="btn" href="/shop" target="_blank">View catalogue</Link></section>
      <section className="panel"><h2>Orders &amp; payments</h2><p>Review customer orders, verify payments and update tailoring or delivery progress.</p><Link className="btn" href="/admin/orders">Manage orders</Link></section>
    </div>
  </>;
}

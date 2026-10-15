import Link from "next/link";
import { SITE } from "@/lib/config";
import { displayPhone } from "@/lib/format";

export default function Footer() {
  return (
    <footer className="wrap site-footer">
      <div>
        <Link className="logo" href="/">{SITE.name}</Link>
        <p>{SITE.tagline}.</p>
      </div>
      <div>
        <p className="label">Help</p>
        <p>{/^\d{10,15}$/.test(SITE.whatsapp) ? `WhatsApp: ${displayPhone(SITE.whatsapp)}` : "WhatsApp consultations coming soon"}</p>
        <p>Delivery across Kenya &middot; Nakuru HQ pickup</p>
        <p><Link href="/#two-ways">How made to measure works</Link></p>
      </div>
      <div>
        <p className="label">Shop</p>
        <p><Link href="/shop">All clothes</Link></p>
        <p><Link href="/shop?category=women">Women</Link> &middot; <Link href="/shop?category=men">Men</Link></p>
        <p><Link href="/#steps-h">How consultations work</Link></p>
      </div>
      <p><Link href="/admin">Admin sign in</Link></p>
      <p className="copy">&copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
    </footer>
  );
}

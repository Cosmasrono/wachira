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
        <p>WhatsApp: {displayPhone(SITE.whatsapp)}</p>
        <p>Delivery across Kenya · Nairobi CBD pickup</p>
        <p><Link href="/#made-to-measure">How made to measure works</Link></p>
      </div>
      <div>
        <p className="label">Shop</p>
        <p><Link href="/shop">All clothes</Link></p>
        <p><Link href="/shop?category=women">Women</Link> · <Link href="/shop?category=men">Men</Link></p>
        <p><Link href="/#our-story">Our story</Link></p>
      </div>
      <p className="copy">© {new Date().getFullYear()} {SITE.name}</p>
    </footer>
  );
}

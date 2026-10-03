import Link from "next/link";
import CartButton from "./CartButton";
import { CATEGORIES, SITE } from "@/lib/config";

export default function Header() {
  return (
    <header className="site">
      <div className="bar">
        <nav className="cats" aria-label="Shop by category">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/shop?category=${c.slug}`}>{c.label}</Link>
          ))}
          <Link href="/shop?fit=custom">Made to measure</Link>
        </nav>
        <Link className="logo" href="/">{SITE.name}</Link>
        <div className="tools">
          <Link className="story-link" href="/#our-story">Our story</Link>
          <Link className="account-link" href="/account">Account</Link>
          <CartButton />
        </div>
      </div>
    </header>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import StyleGallery from "@/components/StyleGallery";
import { CATEGORIES, CUSTOM_FEE, CUSTOM_LEAD_TIME } from "@/lib/config";
import { ksh } from "@/lib/format";
import { db } from "@/lib/db";

type Props = { searchParams: Promise<{ category?: string; fit?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category, fit } = await searchParams;
  const cat = CATEGORIES.find((c) => c.slug === category);
  return { title: fit === "custom" ? "Made to measure" : cat ? `${cat.label}'s clothing` : "Shop" };
}

export default async function Shop({ searchParams }: Props) {
  const { category, fit } = await searchParams;
  const custom = fit === "custom";
  const cat = CATEGORIES.find((c) => c.slug === category);
  const products = await db.product.findMany({
    where: { active: true, ...(cat ? { category: cat.slug } : {}), ...(custom ? { allowCustom: true, measureFields: { not: "" } } : {}) },
    orderBy: { createdAt: "desc" },
  });

  return (
    <section className="first">
      <div className="sec-head">
        <div><p className="label">The Wachira wardrobe</p><h1>{custom ? "Made to measure" : cat ? cat.label : "The collection"}</h1><p className="collection-intro">Choose an outfit picture, enter your size and contact details, then add it to your bag.</p></div>
        <nav className="chips" aria-label="Filter by category">
          <Link className="chip" href="/shop" aria-current={!cat && !custom ? "page" : undefined}>All</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} className="chip" href={`/shop?category=${c.slug}`} aria-current={cat?.slug === c.slug && !custom ? "page" : undefined}>
              {c.label}
            </Link>
          ))}
          <Link className="chip" href="/shop?fit=custom" aria-current={custom ? "page" : undefined}>Made to measure</Link>
        </nav>
      </div>
      <div className="catalog-fitting">
        <div className="catalog-fitting-photo">
          <Image src="/home/hero-fitting.jpg" alt="A tailor measuring a customer's shoulder for a navy suit" fill sizes="(max-width: 640px) 100vw, 40vw" style={{ objectFit: "cover", objectPosition: "center 30%" }} />
        </div>
        <div className="catalog-fitting-copy">
          <p className="label">Made to your measurements</p>
          <h2>Your style. Your fit.</h2>
          <p>Choose your outfit from the photo samples below. Select your usual size or enter your measurements, add your contact details, and add the outfit to your bag.</p>
          <p className="hint">Custom tailoring adds {ksh(CUSTOM_FEE)} per item. Ready in {CUSTOM_LEAD_TIME}, before delivery.</p>
          {custom ? (
            <a className="btn primary" href="#catalog-products">Choose your outfit ↓</a>
          ) : (
            <Link className="btn primary" href="/shop?fit=custom#catalog-products">Shop made to measure →</Link>
          )}
        </div>
      </div>
      <div id="catalog-products">
      {products.length === 0 ? (
        <p className="empty">No styles here yet. Check back soon.</p>
      ) : (
        <div className="grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
      </div>
      <StyleGallery products={products.map(({ slug, name, category, image, image2, price }) => ({ slug, name, category, image, image2, price }))} />
    </section>
  );
}

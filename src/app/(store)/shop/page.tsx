import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES } from "@/lib/config";
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
        <div><p className="label">The Wachira wardrobe</p><h1>{custom ? "Made to measure" : cat ? cat.label : "The collection"}</h1><p className="collection-intro">{custom ? "Choose your piece. Follow the measurement guide. Make it yours." : "Tailored silhouettes, expressive colour, and a fit that feels like you."}</p></div>
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
      {products.length === 0 ? (
        <p className="empty">No styles here yet. Check back soon.</p>
      ) : (
        <div className="grid">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}

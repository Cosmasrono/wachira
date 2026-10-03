import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductImage from "@/components/ProductImage";
import { CATEGORIES, CUSTOM_FEE, CUSTOM_LEAD_TIME, DELIVERY, FREE_NAIROBI_OVER } from "@/lib/config";
import { db } from "@/lib/db";
import { ksh } from "@/lib/format";

export const revalidate = 60;

export default async function Home() {
  const products = await db.product.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
  const featured = products.find((p) => p.featured) ?? products[0];
  const companion = products.find((p) => p.category === "women" && p.id !== featured?.id) ?? products.find((p) => p.id !== featured?.id);
  return (
    <>
      <div className="hero editorial-hero">
        <div className="hero-copy">
          <p className="label">Wachira · Nairobi, Kenya</p>
          <h1>Made in Kenya.<br />Made for <em>you.</em></h1>
          <p className="lead">For everyday confidence and the days you&apos;ll always remember. Discover suits and matching sets in your size, or made to your measurements.</p>
          <div className="cta-row"><Link className="btn primary" href="/shop">Explore the collection ↗</Link><a className="text-link" href="#made-to-measure">Find your perfect fit</a></div>
          <div className="hero-footnote"><span>01 / The Wachira wardrobe</span><span>Thoughtful fit. Personal style.</span></div>
        </div>
        <div className="hero-composition">
          {featured && <Link href={`/products/${featured.slug}`} className="hero-art">
            <ProductImage src={featured.image} alt={featured.name} priority sizes="(max-width: 900px) 85vw, 42vw" />
            <span className="hero-tag"><span className="label">In focus</span><b>{featured.name}</b><span className="price">{ksh(featured.price)} ↗</span></span>
          </Link>}
          {companion && <Link href={`/products/${companion.slug}`} className="hero-inset"><ProductImage src={companion.image} alt={companion.name} sizes="(max-width: 900px) 32vw, 18vw" /><span>Explore womenswear ↗</span></Link>}
          <span className="vertical-caption" aria-hidden="true">The art of getting dressed</span>
        </div>
      </div>
      <div className="promise-strip" aria-label="Shopping at Wachira"><span>Designed in Nairobi</span><span>Standard & custom fit</span><span>M-Pesa checkout</span><span>Delivery across Kenya</span></div>
      <section aria-labelledby="cat-h">
        <div className="sec-head"><div><p className="label">Your wardrobe, your way</p><h2 id="cat-h">Find your next favourite.</h2></div><Link href="/shop" className="more">Shop all styles ↗</Link></div>
        <div className="cat-grid editorial-categories">{CATEGORIES.map((c) => {
          const inCat = products.filter((p) => p.category === c.slug);
          return <Link key={c.slug} href={`/shop?category=${c.slug}`} className="cat"><ProductImage src={inCat[0]?.image} alt={`${c.label}'s collection`} sizes="(max-width: 640px) 100vw, 45vw" /><span className="category-caption"><span className="label">The collection</span><span>{c.label} <i aria-hidden="true">↗</i></span><small>{inCat.length} styles to make your own</small></span></Link>;
        })}</div>
      </section>
      <section aria-labelledby="new-h">
        <div className="sec-head"><div><p className="label">Fresh from the collection</p><h2 id="new-h">New arrivals</h2></div><Link href="/shop" className="more">View the collection ↗</Link></div>
        {products.length ? <div className="grid">{products.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}</div> : <p className="empty">Our next collection is on its way. Check back soon.</p>}
      </section>
      <section id="made-to-measure" className="tailoring-section" aria-labelledby="mtm-h">
        <div className="tailoring-intro"><div><p className="label">A little more personal</p><h2 id="mtm-h">Your style.<br /><em>Your measurements.</em></h2></div><div><p>You choose the piece. We tailor it to you. Our guided measurement form takes you through each detail, with space to tell us how you like your clothes to fit.</p><p className="tailoring-facts">{ksh(CUSTOM_FEE)} extra per item <span>·</span> {CUSTOM_LEAD_TIME} to make</p><Link href="/shop?fit=custom" className="text-link">Explore made to measure ↗</Link></div></div>
        <ol className="how"><li><b>Choose your piece</b><span>Find a style you love and select Made for me.</span></li><li><b>Make it your fit</b><span>Follow the illustrated guide in centimetres or inches.</span></li><li><b>Check every detail</b><span>Review your measurements, then pay with M-Pesa.</span></li><li><b>Follow its journey</b><span>Track your order from payment through to delivery.</span></li></ol>
      </section>
      <section className="occasion-story" aria-labelledby="occasion-h">
        <div className="occasion-image"><ProductImage src="/products/wedding-party.jpg" alt="A wedding party wearing coordinated tailored suits" sizes="(max-width: 900px) 100vw, 55vw" /></div>
        <div className="occasion-copy"><p className="label">For the days that matter</p><h2 id="occasion-h">A moment.<br />A lasting impression.</h2><p>From the wedding aisle to a celebration with your favourite people, discover tailoring you can make your own.</p><Link href="/shop?category=men" className="btn">Discover the suits ↗</Link></div>
      </section>
      <section className="brand-story" id="our-story" aria-labelledby="story-h"><p className="label">Rooted in Nairobi</p><h2 id="story-h">Clothes with a sense of home.<br />And room to be yourself.</h2><p>Wachira brings together tailored silhouettes, expressive colour and a personal approach to fit. Choose a standard size or share your measurements for a piece made for you, here in Kenya.</p><Link href="/shop" className="text-link">Find your Wachira piece ↗</Link></section>
      <section aria-label="Delivery and payment"><div className="service"><div><b>Pay your way, with M-Pesa</b><span>A payment prompt sent to your phone.</span></div><div><b>Nairobi delivery</b><span>{ksh(DELIVERY.NAIROBI.fee)}, free from {ksh(FREE_NAIROBI_OVER)}.</span></div><div><b>Across Kenya</b><span>Delivery to other counties: {ksh(DELIVERY.COUNTY.fee)}.</span></div><div><b>Pick it up</b><span>Free pickup in Nairobi CBD.</span></div></div></section>
    </>
  );
}

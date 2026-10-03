import Image from "next/image";
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
  const fromPrice = products.length ? Math.min(...products.map((p) => p.price)) : 0;
  const standardPick = products.find((p) => p.category === "women") ?? products[0];

  return (
    <>
      {/* 1. Hero: what we sell + what to do next */}
      <section className="home-hero first" aria-labelledby="home-h">
        <div className="home-hero-copy">
          <p className="home-eyebrow"><span className="dot" aria-hidden="true" />Tailored suits &amp; matching sets · Nairobi</p>
          <h1 id="home-h">Clothes that fit you. <em>Perfectly.</em></h1>
          <p className="home-lead">
            Choose a suit or matching set, order it in your <b>standard size</b> or send us <b>your measurements</b>,
            and pay with <b>M-Pesa</b>. We sew it in Nairobi and deliver anywhere in Kenya.
          </p>
          <div className="home-ctas">
            <Link className="btn primary lg" href="/shop">Shop the collection →</Link>
            <Link className="btn lg ghost" href="/shop?fit=custom">Get it made to measure</Link>
          </div>
          <ul className="home-trust" aria-label="Why shop with us">
            <li><i aria-hidden="true">✓</i>Pay with M-Pesa</li>
            <li><i aria-hidden="true">✓</i>Delivery across Kenya</li>
            <li><i aria-hidden="true">✓</i>Custom fit in {CUSTOM_LEAD_TIME}</li>
          </ul>
        </div>

        <div className="home-hero-media">
          <div className="home-hero-img">
            <Image src="/home/hero-fitting.jpg" alt="A Wachira tailor measuring a customer for a navy suit" fill priority sizes="(max-width: 900px) 100vw, 48vw" style={{ objectFit: "cover" }} />
          </div>
          {fromPrice > 0 && (
            <div className="home-float home-float-price">
              <span className="label">Suits &amp; sets from</span>
              <b className="price">{ksh(fromPrice)}</b>
            </div>
          )}
          {featured && (
            <Link href={`/products/${featured.slug}`} className="home-float home-float-product">
              <span className="thumb"><ProductImage src={featured.image} alt={featured.name} sizes="72px" /></span>
              <span><small>Bestseller</small><b>{featured.name}</b><span className="price">{ksh(featured.price)} ↗</span></span>
            </Link>
          )}
        </div>
      </section>

      {/* 2. How it works — the three steps, right under the hero */}
      <section className="home-steps" aria-labelledby="steps-h">
        <div className="home-sec-head">
          <p className="label">How ordering works</p>
          <h2 id="steps-h">Your outfit in 3 simple steps</h2>
        </div>
        <ol className="home-steps-list">
          <li>
            <span className="num">1</span>
            <b>Pick a style</b>
            <p>Browse our suits, skirt suits and matching sets for men and women.</p>
            <Link href="/shop" className="text-link">Browse styles →</Link>
          </li>
          <li>
            <span className="num">2</span>
            <b>Choose your fit</b>
            <p>Select a standard size (S–XXL), or enter your measurements with our step-by-step guide.</p>
            <Link href="/#two-ways" className="text-link">Compare options →</Link>
          </li>
          <li>
            <span className="num">3</span>
            <b>Pay with M-Pesa &amp; relax</b>
            <p>Confirm with your M-Pesa PIN, then track your order until it reaches your door.</p>
            <Link href="/#delivery" className="text-link">Delivery details →</Link>
          </li>
        </ol>
      </section>

      {/* 3. The two ways to order */}
      <section id="two-ways" className="home-paths" aria-labelledby="paths-h">
        <div className="home-sec-head">
          <p className="label">Two ways to order</p>
          <h2 id="paths-h">Ready size or made for you?</h2>
        </div>
        <div className="home-paths-grid">
          <Link href="/shop" className="home-path">
            <div className="home-path-img">
              <ProductImage src={standardPick?.image} alt="A standard-size Wachira outfit" sizes="(max-width: 900px) 100vw, 50vw" />
            </div>
            <div className="home-path-body">
              <span className="home-tag">Fastest</span>
              <h3>Standard sizes</h3>
              <p>Pick S, M, L, XL or XXL and check out in under a minute.</p>
              <ul>
                <li>Sizes S – XXL</li>
                <li>No extra cost</li>
              </ul>
              <span className="btn primary">Shop standard sizes →</span>
            </div>
          </Link>
          <Link href="/shop?fit=custom" className="home-path accent">
            <div className="home-path-img">
              <Image src="/home/measure-at-home.jpg" alt="A customer measuring her waist at home" fill sizes="(max-width: 900px) 100vw, 50vw" style={{ objectFit: "cover" }} />
            </div>
            <div className="home-path-body">
              <span className="home-tag">Perfect fit</span>
              <h3>Made to measure</h3>
              <p>Measure yourself at home with our illustrated guide — we tailor the piece to your body.</p>
              <ul>
                <li>+{ksh(CUSTOM_FEE)} per item</li>
                <li>Ready in {CUSTOM_LEAD_TIME}</li>
              </ul>
              <span className="btn primary">Start made to measure →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 4. Shop by category */}
      <section aria-labelledby="cat-h">
        <div className="sec-head"><div><p className="label">Shop by category</p><h2 id="cat-h">Who are you shopping for?</h2></div><Link href="/shop" className="more">Shop all styles ↗</Link></div>
        <div className="cat-grid editorial-categories">{CATEGORIES.map((c) => {
          const inCat = products.filter((p) => p.category === c.slug);
          return <Link key={c.slug} href={`/shop?category=${c.slug}`} className="cat"><ProductImage src={inCat[0]?.image} alt={`${c.label}'s collection`} sizes="(max-width: 640px) 100vw, 45vw" /><span className="category-caption"><span className="label">Shop</span><span>{c.label} <i aria-hidden="true">↗</i></span><small>{inCat.length} styles · standard or custom fit</small></span></Link>;
        })}</div>
      </section>

      {/* 5. New arrivals */}
      <section aria-labelledby="new-h">
        <div className="sec-head"><div><p className="label">Fresh from the workshop</p><h2 id="new-h">New arrivals</h2></div><Link href="/shop" className="more">View all ↗</Link></div>
        {products.length ? <div className="grid">{products.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}</div> : <p className="empty">Our next collection is on its way. Check back soon.</p>}
      </section>

      {/* 6. Payment & delivery */}
      <section id="delivery" className="home-delivery" aria-labelledby="delivery-h">
        <div className="home-delivery-img">
          <Image src="/home/delivered.jpg" alt="A tailored suit packed for delivery next to a phone showing M-Pesa payment confirmed" fill sizes="(max-width: 900px) 100vw, 50vw" style={{ objectFit: "cover" }} />
        </div>
        <div className="home-delivery-copy">
          <p className="label">Payment &amp; delivery</p>
          <h2 id="delivery-h">Pay with M-Pesa. We bring it to you.</h2>
          <dl className="home-facts">
            <div><dt>M-Pesa checkout</dt><dd>A payment prompt is sent to your phone — just enter your PIN.</dd></div>
            <div><dt>Nairobi delivery</dt><dd>{ksh(DELIVERY.NAIROBI.fee)}, or <b>free</b> on orders over {ksh(FREE_NAIROBI_OVER)}.</dd></div>
            <div><dt>Rest of Kenya</dt><dd>{ksh(DELIVERY.COUNTY.fee)} to any county.</dd></div>
            <div><dt>Pick up</dt><dd>Free collection in Nairobi CBD.</dd></div>
          </dl>
          <Link href="/shop" className="btn primary lg">Start shopping →</Link>
        </div>
      </section>

      {/* 7. Occasions */}
      <section className="occasion-story" aria-labelledby="occasion-h">
        <div className="occasion-image"><ProductImage src="/products/wedding-party.jpg" alt="A wedding party wearing coordinated tailored suits" sizes="(max-width: 900px) 100vw, 55vw" /></div>
        <div className="occasion-copy"><p className="label">Weddings &amp; group orders</p><h2 id="occasion-h">Dressing the whole wedding party?</h2><p>Order matching suits for the groom, groomsmen and family — each made to their own measurements. Chat with us on WhatsApp for group orders.</p><Link href="/shop?category=men" className="btn">See the suits ↗</Link></div>
      </section>

      {/* 8. Final call to action */}
      <section className="home-final" aria-labelledby="final-h">
        <h2 id="final-h">Ready to find your perfect fit?</h2>
        <p>Browse the collection, pick your size or send your measurements, and pay with M-Pesa.</p>
        <div className="home-ctas center">
          <Link className="btn primary lg" href="/shop">Shop now →</Link>
          <Link className="btn lg ghost-light" href="/signup">Create a free account</Link>
        </div>
      </section>
    </>
  );
}

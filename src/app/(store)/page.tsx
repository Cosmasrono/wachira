import ConsultLink from "@/components/ConsultLink";
import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductImage from "@/components/ProductImage";
import StyleGallery from "@/components/StyleGallery";
import { CATEGORIES, CUSTOM_FEE, CUSTOM_LEAD_TIME, DELIVERY, HQ } from "@/lib/config";
import { db } from "@/lib/db";
import { ksh } from "@/lib/format";
import {
  ArrowRight,
  Check,
  CreditCard,
  Truck,
  Scissors,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

export const revalidate = 60;

export default async function Home() {
  const products = await db.product.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
  const featured = products.find((p) => p.featured) ?? products[0];
  const prices = products.map((p) => p.price).filter((price) => price > 0);
  const fromPrice = prices.length ? Math.min(...prices) : 0;
  const standardPick = products.find((p) => p.category === "women") ?? products[0];

  return (
    <>
      {/* 1. Hero: what we sell + what to do next */}
      <section className="home-hero first" aria-labelledby="home-h">
        <div className="home-hero-background" aria-hidden="true">
          <Image src="/home/hero-fitting.jpg" alt="" fill priority sizes="100vw" />
        </div>
        <div className="home-hero-copy">
          <h1 id="home-h">Clothes that fit you. <em>Perfectly.</em></h1>
          <p className="home-lead">
            Choose a suit or matching set, order online, or consult with us on <b>WhatsApp</b> about your <b>size and measurements</b>.
            We confirm the details with you, sew it at our {HQ} HQ and deliver anywhere in Kenya.
          </p>
          <div className="home-ctas">
            <Link className="btn primary lg flex items-center gap-2" href="/shop">
              Shop the collection <ArrowRight size={18} />
            </Link>
            <Link className="btn lg ghost-light flex items-center gap-2" href="/shop?fit=custom">
              <Scissors size={18} /> Get it made to measure
            </Link>
          </div>
          <ul className="home-trust" aria-label="Why shop with us">
            <li>
              <i><CreditCard size={13} /></i> WhatsApp consultations
            </li>
            <li>
              <i><Truck size={13} /></i> Delivery across Kenya
            </li>
            <li>
              <i><Scissors size={13} /></i> Custom fit in {CUSTOM_LEAD_TIME}
            </li>
          </ul>
        </div>

        <div className="home-hero-media">
          {fromPrice > 0 && (
            <div className="home-float home-float-price">
              <span className="label">Suits &amp; sets from</span>
              <b className="price">{ksh(fromPrice)}</b>
            </div>
          )}
          {featured && (
            <Link href={`/products/${featured.slug}`} className="home-float home-float-product">
              <span className="thumb">
                <ProductImage src={featured.image} alt={featured.name} sizes="72px" />
              </span>
              <span>
                <small className="flex items-center gap-1">
                  <Sparkles size={11} /> Featured style
                </small>
                <b>{featured.name}</b>
                <span className="price flex items-center gap-1">
                  {featured.price > 0 ? ksh(featured.price) : "Price on consultation"} <ArrowRight size={12} />
                </span>
              </span>
            </Link>
          )}
        </div>
      </section>

      <StyleGallery preview products={products.map(({ slug, name, category, image, image2, price }) => ({ slug, name, category, image, image2, price }))} />

      {/* Browse products immediately after the outfit edit */}
      <section aria-labelledby="new-h">
        <div className="sec-head">
          <div>
            <p className="label">Fresh from the workshop</p>
            <h2 id="new-h">New arrivals</h2>
          </div>
          <Link href="/shop" className="more flex items-center gap-1 font-semibold">
            View all <ArrowRight size={16} />
          </Link>
        </div>
        {products.length ? (
          <div className="grid">
            {products.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="empty">Our next collection is on its way. Check back soon.</p>
        )}
      </section>

      {/* How consultations work */}
      <section className="home-steps" aria-labelledby="steps-h">
        <div className="home-sec-head">
          <p className="label">How consultations work</p>
          <h2 id="steps-h">Your outfit in 3 simple steps</h2>
        </div>
        <ol className="home-steps-list">
          <li>
            <span className="num">1</span>
            <b>Pick a style</b>
            <p>Browse our suits, skirt suits and matching sets for men and women.</p>
            <Link href="/shop" className="text-link flex items-center gap-1 font-medium">
              Browse styles <ArrowRight size={14} />
            </Link>
          </li>
          <li>
            <span className="num">2</span>
            <b>Chat with us on WhatsApp</b>
            <p>Tell us your preferred outfit, size and colours. We will help you choose the right fit.</p>
            <Link href="/#two-ways" className="text-link flex items-center gap-1 font-medium">
              Compare options <ArrowRight size={14} />
            </Link>
          </li>
          <li>
            <span className="num">3</span>
            <b>Confirm the details together</b>
            <p>We agree on the fabric, measurements, price and delivery with you on WhatsApp.</p>
            <Link href="/#delivery" className="text-link flex items-center gap-1 font-medium">
              Delivery details <ArrowRight size={14} />
            </Link>
          </li>
        </ol>
      </section>

      {/* 3. The two ways to order */}
      <section id="two-ways" className="home-paths" aria-labelledby="paths-h">
        <div className="home-sec-head">
          <p className="label">Two ways to find your fit</p>
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
              <p>Choose your usual size and ask us about availability on WhatsApp.</p>
              <ul>
                <li><Check size={14} className="inline text-ok mr-2" /> Sizes S &ndash; XXL</li>
                <li><Check size={14} className="inline text-ok mr-2" /> No extra tailoring fee</li>
              </ul>
              <span className="btn primary flex items-center gap-2">
                Shop standard sizes <ArrowRight size={16} />
              </span>
            </div>
          </Link>
          <Link href="/shop?fit=custom" className="home-path accent">
            <div className="home-path-img">
              <Image src="/home/measure-at-home.jpg" alt="A customer measuring her waist at home" fill sizes="(max-width: 900px) 100vw, 50vw" style={{ objectFit: "cover" }} />
            </div>
            <div className="home-path-body">
              <span className="home-tag">Perfect fit</span>
              <h3>Made to measure</h3>
              <p>Consult with us about your measurements &mdash; we tailor the piece to your body.</p>
              <ul>
                <li><Check size={14} className="inline text-ok-light mr-2" /> +{ksh(CUSTOM_FEE)} per item</li>
                <li><Check size={14} className="inline text-ok-light mr-2" /> Ready in {CUSTOM_LEAD_TIME}</li>
              </ul>
              <span className="btn primary flex items-center gap-2">
                Start made to measure <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* 4. Shop by category */}
      <section aria-labelledby="cat-h">
        <div className="sec-head">
          <div>
            <p className="label">Shop by category</p>
            <h2 id="cat-h">Who are you shopping for?</h2>
          </div>
          <Link href="/shop" className="more flex items-center gap-1 font-semibold">
            Shop all styles <ArrowRight size={16} />
          </Link>
        </div>
        <div className="cat-grid editorial-categories">
          {CATEGORIES.map((c) => {
            const inCat = products.filter((p) => p.category === c.slug);
            return (
              <Link key={c.slug} href={`/shop?category=${c.slug}`} className="cat">
                <ProductImage src={inCat[0]?.image} alt={`${c.label}'s collection`} sizes="(max-width: 640px) 100vw, 45vw" />
                <span className="category-caption">
                  <span className="label">Shop</span>
                  <span>{c.label} <ArrowRight size={22} className="inline-block" /></span>
                  <small>{inCat.length} styles &middot; standard or custom fit</small>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 6. Payment & delivery */}
      <section id="delivery" className="home-delivery" aria-labelledby="delivery-h">
        <div className="home-delivery-img">
          <Image
            src="/home/delivered.jpg"
            alt="A tailored suit packed for delivery next to a phone showing M-Pesa payment confirmed"
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="home-delivery-copy">
          <p className="label">Payment &amp; delivery</p>
          <h2 id="delivery-h">Pay with M-Pesa. We bring it to you.</h2>
          <dl className="home-facts">
            <div>
              <dt className="flex items-center gap-2">
                <CreditCard size={16} className="text-accent" /> Payment arrangements
              </dt>
              <dd>We confirm your quote and payment arrangements with you on WhatsApp.</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2">
                <Truck size={16} className="text-accent" /> Countrywide delivery
              </dt>
              <dd>{ksh(DELIVERY.COUNTY.fee)} to any county in Kenya.</dd>
            </div>
            <div>
              <dt className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-accent" /> Pick up
              </dt>
              <dd>Free collection from our {HQ} HQ.</dd>
            </div>
          </dl>
          <Link href="/shop" className="btn primary lg flex items-center gap-2" style={{ display: "inline-flex" }}>
            Start shopping <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* 7. Occasions */}
      <section className="occasion-story" aria-labelledby="occasion-h">
        <div className="occasion-image">
          <ProductImage src="/products/wedding-party.jpg" alt="A wedding party wearing coordinated tailored suits" sizes="(max-width: 900px) 100vw, 55vw" />
        </div>
        <div className="occasion-copy">
          <p className="label">Weddings &amp; group orders</p>
          <h2 id="occasion-h">Dressing the whole wedding party?</h2>
          <p>
            Order matching suits for the groom, groomsmen and family &mdash; each made to their own measurements. Chat with us on WhatsApp for group orders.
          </p>
          <Link href="/shop?category=men" className="btn flex items-center gap-2" style={{ display: "inline-flex" }}>
            See the suits <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* 8. Final call to action */}
      <section className="home-final" aria-labelledby="final-h">
        <h2 id="final-h">Ready to find your perfect fit?</h2>
        <p>Browse the collection and consult with us on WhatsApp about the outfit you love.</p>
        <div className="home-ctas center">
          <Link className="btn primary lg flex items-center gap-2" href="/shop">
            Shop now <ArrowRight size={18} />
          </Link>
          <ConsultLink className="btn lg ghost-light">Consult on WhatsApp ↗</ConsultLink>
        </div>
      </section>
    </>
  );
}

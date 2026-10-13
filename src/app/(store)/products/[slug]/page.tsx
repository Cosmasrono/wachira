import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import ConsultLink from "@/components/ConsultLink";
import AddToBag from "@/components/AddToBag";
import ProductImage from "@/components/ProductImage";
import ProductCard from "@/components/ProductCard";
import { categoryLabel, CUSTOM_LEAD_TIME, DELIVERY, FREE_NAIROBI_OVER } from "@/lib/config";
import { db } from "@/lib/db";
import { ksh, splitList } from "@/lib/format";
import { LOOKS } from "@/lib/looks";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ sample?: string }> };

const getProduct = cache((slug: string) => db.product.findFirst({ where: { slug, active: true } }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  return {
    title: p.name,
    description: p.description,
    openGraph: p.image ? { images: [p.image] } : undefined,
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();

  const images = [p.image, p.image2].filter(Boolean) as string[];
  const samples = [...new Set(images)].map((image, index) => ({ image, label: LOOKS.find((look) => `/products/${look.image}` === image)?.name ?? `Sample ${index + 1}` }));
  const requestedSample = (await searchParams).sample;
  const initialSample = samples.find((sample) => sample.image === requestedSample)?.image;
  const related = await db.product.findMany({ where: { active: true, category: p.category, id: { not: p.id } }, take: 4, orderBy: { createdAt: "desc" } });

  return (
    <>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href={`/shop?category=${p.category}`}>{categoryLabel(p.category)}</Link><span>/</span><span aria-current="page">{p.name}</span></nav>
    <div className="pdp first">
      <div className="gallery">
        {(images.length ? images : [null]).map((src, i) => (
          <div className="shot" key={i}>
            <ProductImage src={src} alt={i === 0 ? p.name : `${p.name}, view ${i + 1}`} fit="contain" priority={i === 0} sizes="(max-width: 900px) 100vw, 50vw" />
          </div>
        ))}
      </div>
      <div className="info">
        <p className="label">
          <Link href={`/shop?category=${p.category}`}>{categoryLabel(p.category)}</Link>
          {p.badge ? ` · ${p.badge}` : ""}
        </p>
        <h1>{p.name}</h1>
        <p>{p.description}</p>
        {splitList(p.colors).length > 0 && (
          <div className="swatches" aria-label="Colours">
            {splitList(p.colors).map((c) => <span key={c} className="sw" style={{ background: c }} />)}
          </div>
        )}
        <p className="price">{p.price > 0 ? ksh(p.price) : "Price on consultation"}</p>
        {p.price > 0 && <AddToBag key={`${p.id}:${initialSample ?? ""}`} product={{
          id: p.id, slug: p.slug, name: p.name, price: p.price, image: p.image,
          sizes: splitList(p.sizes), measureFields: splitList(p.measureFields), allowCustom: p.allowCustom,
          samples, initialSample,
        }} />}
        <p>Like this style? Consult with us on WhatsApp about fabric, fit, colours and availability. We will confirm your measurements, price and delivery together.</p>
        <p className="hint">Available sizes: {splitList(p.sizes).join(", ")}. {p.allowCustom && "Made-to-measure options available."}</p>
        <ConsultLink name={p.name} slug={p.slug} className="btn primary">Consult about this outfit on WhatsApp ↗</ConsultLink>
        <div className="product-details">
          <details className="detail-panel"><summary>Delivery & collection</summary><p>Free pickup in Nairobi CBD. Nairobi delivery is {ksh(DELIVERY.NAIROBI.fee)}, or free on orders of {ksh(FREE_NAIROBI_OVER)} or more. Other counties: {ksh(DELIVERY.COUNTY.fee)}.</p>{p.allowCustom && <p>Made-to-measure pieces take {CUSTOM_LEAD_TIME} to make after payment, before delivery.</p>}<p>We will confirm progress and delivery with you on WhatsApp.</p></details>
          <details className="detail-panel"><summary>Fabric, care & fit advice</summary><p>Contact us about this piece for fabric composition, care instructions and sizing advice before ordering. When your garment arrives, follow its care label.</p></details>
          <details className="detail-panel"><summary>Exchanges & alterations</summary><p>Need help with the fit? Continue your WhatsApp conversation with us. Ask us to confirm the exchange and alteration terms for this style before ordering, especially for custom pieces.</p></details>
        </div>
      </div>
    </div>
    {related.length > 0 && <section aria-labelledby="related-h"><div className="sec-head"><div><p className="label">Keep exploring</p><h2 id="related-h">You might also love</h2></div><Link className="more" href={`/shop?category=${p.category}`}>View collection ↗</Link></div><div className="grid">{related.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>}
    </>
  );
}

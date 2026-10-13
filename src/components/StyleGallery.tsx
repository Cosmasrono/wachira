"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ConsultLink from "./ConsultLink";
import { ksh } from "@/lib/format";

const filters = [
  { value: "all", label: "All looks" },
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
] as const;

type GalleryProduct = { slug: string; name: string; category: string; image: string | null; image2: string | null; price: number };

export default function StyleGallery({ preview = false, products }: {
  preview?: boolean;
  products: GalleryProduct[];
}) {
  const allLooks = products.flatMap((product) => [product.image, product.image2]
    .filter((image, index, images): image is string => !!image && images.indexOf(image) === index)
    .map((image) => ({ ...product, image })));
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const looks = allLooks.filter((look) => category === "all" || look.category === category);
  const visible = preview ? looks.slice(0, 4) : expanded ? looks : looks.slice(0, 8);
  if (!allLooks.length) return null;

  return (
    <section className="style-gallery" id={preview ? "style-preview" : "style-gallery"} aria-labelledby={preview ? "style-preview-heading" : "style-gallery-heading"}>
      <div className="sec-head">
        <div>
          <p className="label">The outfit edit</p>
          <h2 id={preview ? "style-preview-heading" : "style-gallery-heading"}>Find your next look.</h2>
          <p className="collection-intro">Statement suits, everyday sets and outfits for your biggest moments.</p>
        </div>
        {preview && <Link className="more" href="/shop#style-gallery">Explore all {allLooks.length} looks →</Link>}
      </div>
      {!preview && <div className="chips look-filters" role="group" aria-label="Filter outfit photos">
        {filters.map((filter) => <button key={filter.value} className="chip" aria-pressed={category === filter.value}
          onClick={() => { setCategory(filter.value); setExpanded(false); }}>{filter.label}</button>)}
      </div>}
      <div className="looks-grid">
        {visible.map((look) => {
          const href = `/products/${look.slug}?sample=${encodeURIComponent(look.image)}`;
          return <article className="look-card" key={`${look.slug}:${look.image}`}>
            <Link className="look-photo" href={href} aria-label={`Choose ${look.name}`}>
              <Image src={look.image} alt={look.name} fill sizes="(max-width: 640px) 50vw, (max-width: 900px) 50vw, 25vw" style={{ objectFit: "contain" }} />
              <span className="look-photo-hint">Choose this outfit →</span>
            </Link>
            <p className="label">{look.category === "men" ? "Menswear" : "Womenswear"}</p>
            <h3>{look.name}</h3>
            <p className="price">{look.price > 0 ? ksh(look.price) : "Price on consultation"}</p>
            {look.price > 0 ? <Link className="more" href={href}>Choose outfit & size →</Link> : <ConsultLink className="more" name={look.name} slug={look.slug}>Ask for a price ↗</ConsultLink>}
          </article>;
        })}
      </div>
      {!preview && <div className="gallery-more">
        <p className="hint" role="status">Showing {visible.length} of {looks.length} looks</p>
        {looks.length > 8 && <button className="btn" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Show fewer looks" : `Show all ${looks.length} looks`}</button>}
      </div>}
    </section>
  );
}

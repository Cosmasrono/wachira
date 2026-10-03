import Link from "next/link";
import type { Product } from "@/lib/db";
import ProductImage from "./ProductImage";
import { ksh, splitList } from "@/lib/format";

export default function ProductCard({ product: p }: { product: Product }) {
  return (
    <article className="card">
      <Link href={`/products/${p.slug}`} className="media" aria-label={p.name}>
        <ProductImage src={p.image} alt={p.name} className="front" />
        {p.image2 && <ProductImage src={p.image2} alt="" className="back" placeholder={false} />}
        {p.badge && <span className="badge">{p.badge}</span>}
      </Link>
      <h3>
        <Link href={`/products/${p.slug}`}>{p.name}</Link>
      </h3>
      <div className="meta">
        <span className="swatches">
          {splitList(p.colors).map((c) => (
            <span key={c} className="sw" style={{ background: c }} />
          ))}
        </span>
        <span className="price">{ksh(p.price)}</span>
      </div>
      {p.allowCustom && splitList(p.measureFields).length > 0 && (
        <span className="hint">Standard sizes or made to measure</span>
      )}
    </article>
  );
}

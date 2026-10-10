import Link from "next/link";
import { categoryLabel } from "@/lib/config";
import { db } from "@/lib/db";
import { ksh, splitList } from "@/lib/format";
import { LOOKS } from "@/lib/looks";

export default async function AdminProducts() {
  const products = await db.product.findMany({ orderBy: { createdAt: "desc" } });
  const samples = LOOKS.filter((look) => !products.some((product) => product.slug === look.productSlug || product.image === `/products/${look.image}` || product.image2 === `/products/${look.image}`));

  return (
    <>
      <div className="admin-head">
        <h1>Products &amp; samples</h1>
        <Link className="btn primary" href="/admin/products/new">Add product or sample</Link>
      </div>
      <p className="hint">Upload photos, add descriptions and sizes, and publish samples for customers to discuss with you on WhatsApp.</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Category</th><th>Sizes</th><th>Made to measure</th><th className="num">Price</th><th>Shown</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/products/${p.id}`}>{p.name}</Link>
                  {p.featured && <span className="custom-tag">Featured</span>}
                </td>
                <td>{categoryLabel(p.category)}</td>
                <td>{splitList(p.sizes).join(", ")}</td>
                <td>{p.allowCustom && p.measureFields ? "Yes" : "No"}</td>
                <td className="num price">{p.price > 0 ? ksh(p.price) : "On consultation"}</td>
                <td>{p.active ? "Yes" : "Hidden"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {samples.length > 0 && <section className="panel">
        <h2>Sample photos ready to add</h2>
        <p className="hint">Add details to these sample photos, then publish them in your catalogue.</p>
        <div className="grid">
          {samples.map((sample) => <article className="card" key={sample.image}>
            <Link href={`/admin/products/new?sample=${encodeURIComponent(sample.image)}`}>
              <img src={`/products/${sample.image}`} alt={sample.name} width={240} height={280} style={{ objectFit: "contain", width: "100%" }} />
              <h3>{sample.name}</h3>
              <span className="more">Add details &amp; publish →</span>
            </Link>
          </article>)}
        </div>
      </section>}
    </>
  );
}

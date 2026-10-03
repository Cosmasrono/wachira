import Link from "next/link";
import { categoryLabel } from "@/lib/config";
import { db } from "@/lib/db";
import { ksh, splitList } from "@/lib/format";

export default async function AdminProducts() {
  const products = await db.product.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <div className="admin-head">
        <h1>Products</h1>
        <Link className="btn primary" href="/admin/products/new">Add product</Link>
      </div>
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
                <td className="num price">{ksh(p.price)}</td>
                <td>{p.active ? "Yes" : "Hidden"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

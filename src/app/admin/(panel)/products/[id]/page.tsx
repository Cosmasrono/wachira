import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductForm from "./ProductForm";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = id === "new" ? null : await db.product.findUnique({ where: { id } });
  if (id !== "new" && !product) notFound();

  return (
    <>
      <p><Link href="/admin/products" className="back">← All products</Link></p>
      <div className="admin-head"><h1>{product ? product.name : "Add product"}</h1></div>
      <ProductForm product={product} />
    </>
  );
}

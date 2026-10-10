import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductForm from "./ProductForm";
import { LOOKS } from "@/lib/looks";

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sample?: string }> }) {
  const { id } = await params;
  const { sample: sampleImage } = await searchParams;
  const sample = id === "new" ? LOOKS.find((look) => look.image === sampleImage) : undefined;
  const product = id === "new" ? null : await db.product.findUnique({ where: { id } });
  if (id !== "new" && !product) notFound();

  return (
    <>
      <p><Link href="/admin/products" className="back">← All products</Link></p>
      <div className="admin-head"><h1>{product ? product.name : "Add product"}</h1></div>
      {sample && <p className="hint">Add a description and available sizes, then publish this sample for WhatsApp consultations. A price is optional.</p>}
      <ProductForm product={product} sample={sample} />
    </>
  );
}

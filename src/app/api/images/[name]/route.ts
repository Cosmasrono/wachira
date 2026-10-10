import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { imageDirectory, imageNamePattern } from "@/lib/image-storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!imageNamePattern.test(name)) return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(join(imageDirectory(), name));
    const type = name.endsWith("jpg") ? "image/jpeg" : name.endsWith("png") ? "image/png" : "image/webp";
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch { return new Response(null, { status: 404 }); }
}

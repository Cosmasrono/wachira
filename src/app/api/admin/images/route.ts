import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/admin";
import { imageDirectory, imageExtension, MAX_IMAGE_BYTES } from "@/lib/image-storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!await currentAdmin()) return NextResponse.json({ error: "Please sign in as an admin." }, { status: 401 });
  if (req.headers.get("origin") !== new URL(req.url).origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!req.body) return NextResponse.json({ error: "Choose an image." }, { status: 400 });
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      return NextResponse.json({ error: "Images must be 5 MB or smaller." }, { status: 413 });
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  const extension = imageExtension(bytes);
  if (!extension) return NextResponse.json({ error: "Choose a JPEG, PNG or WebP image." }, { status: 400 });
  const name = `${randomBytes(16).toString("hex")}.${extension}`;
  try {
    await mkdir(imageDirectory(), { recursive: true });
    await writeFile(join(imageDirectory(), name), bytes, { flag: "wx" });
    return NextResponse.json({ url: `/api/images/${name}` });
  } catch {
    return NextResponse.json({ error: "The image could not be saved. Please try again." }, { status: 500 });
  }
}

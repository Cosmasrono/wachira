import { join, resolve } from "node:path";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const imageDirectory = () => resolve(process.env.IMAGE_UPLOAD_DIR || join(process.cwd(), "uploads", "products"));
export const imageNamePattern = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

export function imageExtension(bytes: Buffer): "jpg" | "png" | "webp" | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

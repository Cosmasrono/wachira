import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processOrderMailJobs } from "@/lib/order-mail";

export async function POST(req: Request) {
  const secret = process.env.JOBS_SECRET;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || secret.length < 32 || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await processOrderMailJobs());
}

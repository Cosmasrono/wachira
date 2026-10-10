import { createHash } from "node:crypto";
import { db } from "./db";

/** Fixed-window counters shared by all server instances; identifiers are hashed. */
export async function allowAuthAttempt(scope: string, identity: string, limit = 10, windowMs = 15 * 60_000) {
  const window = Math.floor(Date.now() / windowMs);
  const id = createHash("sha256").update(`${scope}:${identity.trim().toLowerCase()}:${window}`).digest("hex");
  const expiresAt = new Date((window + 1) * windowMs);
  try {
    await db.authLimit.upsert({ where: { id }, create: { id, count: 0, expiresAt }, update: {} });
  } catch (error) {
    // Two first requests may race to insert the same counter.
    if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) throw error;
  }
  const claimed = await db.authLimit.updateMany({ where: { id, count: { lt: limit } }, data: { count: { increment: 1 } } });
  return claimed.count === 1;
}

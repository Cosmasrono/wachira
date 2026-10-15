import { db, type Prisma } from "./db";

/** Retry only aborted write conflicts; the callback must contain database work only. */
export async function paymentTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, { maxWait: 5000, timeout: 15000 });
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2034" || attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt + Math.random() * 100));
    }
  }
}

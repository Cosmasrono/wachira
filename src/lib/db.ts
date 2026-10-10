import { PrismaClient, Prisma } from "../../node_modules/.prisma/wachira-client";

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Invalidate a client cached before the payment and email models were added.
if (globalForPrisma.prisma && !("paymentAttempt" in globalForPrisma.prisma)) {
  delete globalForPrisma.prisma;
}

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export { Prisma };
export type { Product, Order, OrderItem, OrderEvent, LoginCode, User } from "../../node_modules/.prisma/wachira-client";

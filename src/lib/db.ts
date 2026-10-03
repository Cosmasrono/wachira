import { PrismaClient, Prisma } from "../../prisma/client";

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Invalidate stale in-memory client if the user model isn't present
if (globalForPrisma.prisma && !("user" in globalForPrisma.prisma)) {
  delete globalForPrisma.prisma;
}

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export { Prisma };
export type { Product, Order, OrderItem, OrderEvent, LoginCode, User } from "../../prisma/client";

import { PrismaClient, Prisma } from "../../node_modules/.prisma/wachira-client";

// Interactive transactions make several round trips to MongoDB Atlas; Prisma's 5s default timeout
// is too short when the network is slow, so every transaction gets the limits payments already use.
const TRANSACTION_OPTIONS = { maxWait: 5000, timeout: 15000 };

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaSchema?: string };
const schemaSignature = JSON.stringify({ models: Prisma.dmmf.datamodel.models, TRANSACTION_OPTIONS });

// A regenerated client (or changed client options) must not reuse an older instance after hot reload.
if (globalForPrisma.prisma instanceof PrismaClient && globalForPrisma.prismaSchema !== schemaSignature) {
  void globalForPrisma.prisma.$disconnect().catch(() => {});
  delete globalForPrisma.prisma;
}

export const db = globalForPrisma.prisma ?? new PrismaClient({ transactionOptions: TRANSACTION_OPTIONS });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaSchema = schemaSignature;
}

export { Prisma };
export type { Product, Order, OrderItem, OrderEvent, LoginCode, User } from "../../node_modules/.prisma/wachira-client";

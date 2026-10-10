// Install a strict in-memory substitute before application modules import db.ts.
// Any database operation not explicitly arranged by a test fails immediately.
const unexpected = async () => { throw new Error("Unexpected database access in test"); };
const delegate = () => Object.fromEntries(
  ["findUnique", "findFirst", "findMany", "create", "update", "updateMany", "deleteMany", "upsert"].map((key) => [key, unexpected]),
);
Object.assign(globalThis, { prisma: {
  user: delegate(), loginCode: delegate(), authLimit: delegate(), order: delegate(),
  paymentAttempt: delegate(), orderEvent: delegate(), orderMailJob: delegate(),
  $transaction: unexpected,
} });

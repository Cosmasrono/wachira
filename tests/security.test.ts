import "./database";
import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { db } from "../src/lib/db";
import { hashPassword, verifyPassword } from "../src/lib/auth";
import { signupCustomerAction } from "../src/app/(store)/auth-actions";
import { checkLoginCode } from "../src/lib/login-code";
import { allowAuthAttempt } from "../src/lib/rate-limit";
import { validateProductionEnv } from "../src/lib/env";
import { isMockPayments } from "../src/lib/mpesa";
import { callbackSchema, paidMetadata } from "../src/lib/payment-callback";

afterEach(() => mock.restoreAll());

test("re-registering an unverified account cannot overwrite its password", async () => {
  process.env.AUTH_SECRET = "a".repeat(40);
  delete process.env.AUTH_TRUSTED_IP_HEADER;
  mock.method(db.authLimit, "upsert", async () => ({}));
  mock.method(db.authLimit, "updateMany", async () => ({ count: 1 }));
  mock.method(db.user, "findUnique", async () => ({ email: "owner@example.com", emailVerified: false, passwordHash: "original" }));
  const update = mock.method(db.user, "update", async () => { throw new Error("Must not replace password"); });
  const create = mock.method(db.user, "create", async () => { throw new Error("Must not create duplicate"); });
  const form = new FormData();
  for (const [key, value] of Object.entries({ name: "New registrant", email: "owner@example.com", password: "replacement-password", confirmPassword: "replacement-password" })) form.set(key, value);
  const result = await signupCustomerAction({}, form);
  assert.match(result.error ?? "", /already pending/);
  assert.equal(update.mock.callCount(), 0);
  assert.equal(create.mock.callCount(), 0);
});

test("async password hashing preserves existing scrypt format and rejects wrong passwords", async () => {
  const hash = await hashPassword("a long password");
  assert.equal(await verifyPassword("a long password", hash), true);
  assert.equal(await verifyPassword("incorrect", hash), false);
  assert.equal(await verifyPassword("anything", "malformed"), false);
});

test("a correct admin code can only be consumed once by simultaneous requests", async () => {
  process.env.AUTH_SECRET = "b".repeat(40);
  const email = "staff@example.com";
  const code = "123456";
  const codeHash = createHmac("sha256", process.env.AUTH_SECRET).update(`admin:${email}:${code}`).digest("hex");
  mock.method(db.loginCode, "findFirst", async () => ({ id: "code-id", attempts: 0, expiresAt: new Date(Date.now() + 60_000), codeHash }));
  mock.method(db.loginCode, "updateMany", async () => ({ count: 1 }));
  let consumed = false;
  mock.method(db.loginCode, "deleteMany", async () => {
    if (consumed) return { count: 0 };
    consumed = true;
    return { count: 1 };
  });
  const results = await Promise.all([checkLoginCode("admin", email, code), checkLoginCode("admin", email, code)]);
  assert.equal(results.filter(Boolean).length, 1);
});

test("an exhausted atomic code budget rejects even a matching stale read", async () => {
  mock.method(db.loginCode, "findFirst", async () => ({ id: "code-id", attempts: 4, expiresAt: new Date(Date.now() + 60_000) }));
  mock.method(db.loginCode, "updateMany", async () => ({ count: 0 }));
  assert.equal(await checkLoginCode("admin", "staff@example.com", "123456"), null);
});

test("account throttle permits only the configured number of concurrent claims", async () => {
  mock.method(db.authLimit, "upsert", async () => ({}));
  let count = 0;
  mock.method(db.authLimit, "updateMany", async ({ where }: any) => ({ count: count < where.count.lt ? (++count, 1) : 0 }));
  const results = await Promise.all(Array.from({ length: 20 }, () => allowAuthAttempt("test", "owner@example.com", 5)));
  assert.equal(results.filter(Boolean).length, 5);
});

test("payment metadata rejects missing, duplicate, nonnumeric amounts and missing receipts", () => {
  const receipt = { Name: "MpesaReceiptNumber", Value: "ABC1234567" };
  for (const Value of [undefined, "not-money", "Infinity", -1, 0]) assert.equal(paidMetadata([{ Name: "Amount", Value }, receipt]), null);
  assert.equal(paidMetadata([{ Name: "Amount", Value: 1000 }]), null);
  assert.equal(paidMetadata([{ Name: "Amount", Value: 1000 }, { Name: "Amount", Value: 1000 }, receipt]), null);
  assert.deepEqual(paidMetadata([{ Name: "Amount", Value: 1000 }, receipt]), { amount: 1000, receipt: "ABC1234567" });
  assert.equal(callbackSchema.safeParse({ Body: { stkCallback: { CheckoutRequestID: "id", ResultCode: null } } }).success, false);
});

test("production rejects mock payments and reports keys without exposing their values", () => {
  const env = { NODE_ENV: "production", MPESA_MODE: "mock", AUTH_SECRET: "do-not-print-this" } as NodeJS.ProcessEnv;
  assert.throws(() => validateProductionEnv(env), (error: Error) => /MPESA_MODE=mock/.test(error.message) && !error.message.includes("do-not-print-this"));
  validateProductionEnv({ NODE_ENV: "development", MPESA_MODE: "mock" });
  const old = { NODE_ENV: process.env.NODE_ENV, MPESA_MODE: process.env.MPESA_MODE };
  Object.assign(process.env, { NODE_ENV: "production", MPESA_MODE: "mock" });
  try { assert.throws(isMockPayments, /disabled in production/); }
  finally { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

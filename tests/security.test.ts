import "./database";
import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { db } from "../src/lib/db";
import { hashPassword, setPasswordWithCode, verifyPassword } from "../src/lib/auth";
import { loginCustomerAction, requestPasswordCodeAction, signupCustomerAction } from "../src/app/(store)/auth-actions";
import { sendAdminCode } from "../src/app/admin/actions";
import { customerFromSession, safeNext } from "../src/lib/customer";
import { checkLoginCode, sendLoginCode } from "../src/lib/login-code";
import { allowAuthAttempt } from "../src/lib/rate-limit";
import { validateProductionEnv } from "../src/lib/env";
import { isMockPayments } from "../src/lib/mpesa";
import { callbackSchema, paidMetadata } from "../src/lib/payment-callback";

afterEach(() => mock.restoreAll());

const isRedirect = (error: any) => String(error?.digest ?? error?.message).includes("NEXT_REDIRECT");

function signupForm(fields: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

function allowCodes() {
  process.env.AUTH_SECRET = "a".repeat(40);
  delete process.env.AUTH_TRUSTED_IP_HEADER;
  delete process.env.MAIL_HOST;
  mock.method(db.authLimit, "upsert", async () => ({}));
  mock.method(db.authLimit, "updateMany", async () => ({ count: 1 }));
  mock.method(db.loginCode, "deleteMany", async () => ({ count: 0 }));
  mock.method(db.loginCode, "create", async () => ({}));
  mock.method(console, "log", () => {});
}

test("signup stores no password: a new account has none until the inbox owner sets one", async () => {
  allowCodes();
  mock.method(db.user, "findUnique", async () => null);
  const create = mock.method(db.user, "create", async () => ({}));
  const form = signupForm({ name: "Wanjiku Kamau", email: "Owner@Example.com", password: "attacker-chosen-pass" });
  await assert.rejects(signupCustomerAction({}, form), isRedirect);
  assert.equal(create.mock.callCount(), 1);
  const data = (create.mock.calls[0].arguments[0] as any).data;
  assert.equal(data.email, "owner@example.com");
  assert.equal(data.passwordHash, "");
  assert.equal(data.emailVerified, false);
  // A name typed at signup is never stored: only the inbox owner chooses it, on the code page.
  assert.equal(data.name, "");
});

test("signing up again with a pending or existing email changes nothing and reveals nothing", async () => {
  for (const emailVerified of [false, true]) {
    allowCodes();
    mock.method(db.user, "findUnique", async () => ({ email: "owner@example.com", name: "Owner", emailVerified, passwordHash: "x:y" }));
    const write = async () => { throw new Error("Must not write to an existing account"); };
    mock.method(db.user, "create", write);
    mock.method(db.user, "update", write);
    mock.method(db.user, "updateMany", write);
    const form = signupForm({ name: "Someone else", email: "owner@example.com" });
    // Same outcome as a brand-new signup: a code is emailed and the code page opens.
    await assert.rejects(signupCustomerAction({}, form), isRedirect);
    mock.restoreAll();
  }
});

test("only the password entered together with the emailed code is activated", async () => {
  process.env.AUTH_SECRET = "c".repeat(40);
  const email = "owner@example.com";
  const code = "123456";
  const codeHash = createHmac("sha256", process.env.AUTH_SECRET).update(`customer_password:${email}:${code}`).digest("hex");
  mock.method(db.loginCode, "findFirst", async () => ({ id: "code-id", attempts: 0, expiresAt: new Date(Date.now() + 60_000), codeHash }));
  mock.method(db.loginCode, "updateMany", async () => ({ count: 1 }));
  let saved: any;
  mock.method(db, "$transaction", async (fn: any) => fn({
    loginCode: { deleteMany: async () => ({ count: 1 }) },
    user: {
      updateMany: async ({ data }: any) => { saved = data; return { count: 1 }; },
      findUnique: async () => ({ id: "user-id", email, name: "Owner" }),
    },
  }));

  const result = await setPasswordWithCode(email, code, "owner-chosen-password");
  assert.equal(result.ok, true);
  assert.equal(saved.emailVerified, true);
  assert.equal(await verifyPassword("owner-chosen-password", saved.passwordHash), true);
  assert.match(saved.sessionKey, /^[a-f\d]{32}$/);
});

test("a wrong code never sets a password", async () => {
  process.env.AUTH_SECRET = "c".repeat(40);
  mock.method(db.loginCode, "findFirst", async () => ({ id: "code-id", attempts: 0, expiresAt: new Date(Date.now() + 60_000), codeHash: "00".repeat(32) }));
  mock.method(db.loginCode, "updateMany", async () => ({ count: 1 }));
  mock.method(db, "$transaction", async () => { throw new Error("Must not update the account"); });
  const result = await setPasswordWithCode("owner@example.com", "654321", "attacker-password");
  assert.equal(result.ok, false);
});

test("sign-in codes are capped per address per day", async () => {
  // The per-minute limit (1) still has room; the daily budget is used up.
  mock.method(db.authLimit, "upsert", async () => ({}));
  mock.method(db.authLimit, "updateMany", async ({ where }: any) => ({ count: where.count.lt === 1 ? 1 : 0 }));
  const result = await sendLoginCode("admin", "staff@example.com");
  assert.equal(result.ok, false);
  assert.match(!result.ok ? result.error : "", /today/);
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

function codeTransaction(account: { name: string; emailVerified: boolean }) {
  process.env.AUTH_SECRET = "c".repeat(40);
  const email = "owner@example.com";
  const codeHash = createHmac("sha256", process.env.AUTH_SECRET).update(`customer_password:${email}:123456`).digest("hex");
  mock.method(db.loginCode, "findFirst", async () => ({ id: "code-id", attempts: 0, expiresAt: new Date(Date.now() + 60_000), codeHash }));
  mock.method(db.loginCode, "updateMany", async () => ({ count: 1 }));
  const saved: any[] = [];
  mock.method(db, "$transaction", async (fn: any) => fn({
    loginCode: { deleteMany: async () => ({ count: 1 }) },
    user: {
      updateMany: async ({ data }: any) => { saved.push(data); return { count: 1 }; },
      findUnique: async () => ({ id: "user-id", email, ...account, sessionKey: saved.at(-1)?.sessionKey ?? null }),
    },
  }));
  return { email, saved };
}

test("a name typed by whoever signed up is dropped unless the inbox owner gives one with the code", async () => {
  const pending = codeTransaction({ name: "Call 0700 000000 to claim", emailVerified: false });
  await setPasswordWithCode(pending.email, "123456", "owner-chosen-password");
  assert.equal(pending.saved[0].name, "");
  mock.restoreAll();

  const named = codeTransaction({ name: "Call 0700 000000 to claim", emailVerified: false });
  await setPasswordWithCode(named.email, "123456", "owner-chosen-password", "Wanjiku Kamau");
  assert.equal(named.saved[0].name, "Wanjiku Kamau");
  mock.restoreAll();

  const reset = codeTransaction({ name: "Wanjiku Kamau", emailVerified: true });
  await setPasswordWithCode(reset.email, "123456", "owner-chosen-password");
  assert.equal(reset.saved[0].name, "Wanjiku Kamau");
});

test("setting a new password signs out sessions issued before it", async () => {
  const { email, saved } = codeTransaction({ name: "Owner", emailVerified: true });
  const uid = "a".repeat(24);
  let sessionKey: string | null = null;
  mock.method(db.user, "findUnique", async () => ({ id: uid, email, name: "Owner", emailVerified: true, sessionKey }));

  // A session issued before any reset carries no version and works while the account has none.
  const stolen = { uid, email };
  assert.ok(await customerFromSession(stolen));

  const result = await setPasswordWithCode(email, "123456", "new-owner-password");
  assert.ok(result.ok);
  sessionKey = saved[0].sessionKey;
  assert.equal(await customerFromSession(stolen), null);
  assert.equal(await customerFromSession({ uid, email, version: "old-key" }), null);
  assert.ok(await customerFromSession({ uid, email, version: result.user.sessionKey ?? undefined }));
});

test("sessions for missing, unverified or non-account ids are refused", async () => {
  mock.method(db.user, "findUnique", async () => null);
  assert.equal(await customerFromSession({ uid: "a".repeat(24), email: "gone@example.com" }), null);
  mock.restoreAll();
  mock.method(db.user, "findUnique", async () => ({ id: "a".repeat(24), email: "x@example.com", name: "", emailVerified: false, sessionKey: null }));
  assert.equal(await customerFromSession({ uid: "a".repeat(24), email: "x@example.com" }), null);
  // Old passwordless sessions used the email as the id; they no longer count as signed in.
  assert.equal(await customerFromSession({ uid: "x@example.com", email: "x@example.com" }), null);
});

test("after-login redirects stay on this site, even with characters browsers strip or rewrite", () => {
  const offSite = ["//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "/\\/evil.com", "https://evil.com", "evil.com", "", undefined];
  for (const next of offSite) assert.equal(safeNext(next), "/shop", JSON.stringify(next));
  assert.equal(safeNext("/orders/W123?tab=items#top"), "/orders/W123?tab=items#top");
  assert.equal(safeNext("/checkout"), "/checkout");
});

test("asking for a reset code replies the same whether or not the address has an account", async () => {
  // The per-minute limit is used up: both kinds of address must get the same "wait" reply.
  for (const account of [null, { email: "owner@example.com", name: "Owner", emailVerified: true }]) {
    allowCodes();
    mock.method(db.authLimit, "updateMany", async ({ where }: any) => ({ count: where.count.lt === 1 ? 0 : 1 }));
    const lookup = mock.method(db.user, "findUnique", async () => account);
    const result = await requestPasswordCodeAction("owner@example.com");
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /wait/);
    assert.equal(lookup.mock.callCount(), 0, "limits must be checked before the account is looked up");
    mock.restoreAll();
  }
  allowCodes();
  mock.method(db.user, "findUnique", async () => null);
  assert.deepEqual(await requestPasswordCodeAction("nobody@example.com"), { ok: true });
});

test("password login runs the same hashing work when there is no account", async () => {
  const real = await hashPassword("the real password");
  const timeLogin = async (account: unknown) => {
    allowCodes();
    mock.method(db.user, "findUnique", async () => account);
    const started = performance.now();
    const result = await loginCustomerAction({}, signupForm({ email: "owner@example.com", password: "a guessed password" }));
    const elapsed = performance.now() - started;
    mock.restoreAll();
    assert.match(result.error ?? "", /Invalid email or password/);
    return elapsed;
  };
  const existing = await timeLogin({ id: "u", email: "owner@example.com", name: "Owner", emailVerified: true, passwordHash: real, sessionKey: null });
  const missing = await timeLogin(null);
  // Both include one scrypt run; without it the missing-account reply would be near-instant.
  assert.ok(missing > existing / 3, `missing ${missing.toFixed(1)}ms vs existing ${existing.toFixed(1)}ms`);
});

test("the admin sign-in form gives the same reply for staff and non-staff addresses", async () => {
  allowCodes();
  process.env.ADMIN_EMAILS = "staff@example.com";
  assert.deepEqual(await sendAdminCode("staff@example.com"), { error: "" });
  assert.deepEqual(await sendAdminCode("stranger@example.com"), { error: "" });
  mock.restoreAll();

  allowCodes();
  mock.method(db.authLimit, "updateMany", async ({ where }: any) => ({ count: where.count.lt === 1 ? 0 : 1 }));
  const staff = await sendAdminCode("staff@example.com");
  const stranger = await sendAdminCode("stranger@example.com");
  assert.equal(staff.error, stranger.error);
  assert.match(stranger.error, /wait/);
});

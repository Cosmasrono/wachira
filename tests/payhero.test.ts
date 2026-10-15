import "./database";
import { afterEach, beforeEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { stkPush, stkQuery, isMockPayments } from "../src/lib/mpesa";
import { validateProductionEnv } from "../src/lib/env";
import { payheroCallbackSchema } from "../src/lib/payment-callback";
import { db } from "../src/lib/db";
import { POST } from "../src/app/api/payhero/callback/[secret]/route";

const originalEnv = { ...process.env };
beforeEach(() => {
  Object.assign(process.env, {
    PAYHERO_API_USERNAME: "api-user", PAYHERO_API_PASSWORD: "api-password",
    PAYHERO_CHANNEL_ID: "123", PAYHERO_CALLBACK_SECRET: "s".repeat(40),
    APP_URL: "https://shop.example", MPESA_MODE: "live",
  });
});
afterEach(() => {
  mock.restoreAll();
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
});

test("STK push sends server-side Basic auth and retains both PayHero identifiers", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async (url: any, init: any) => {
    assert.equal(url, "https://backend.payhero.co.ke/api/v2/payments");
    assert.equal(init.headers.Authorization, `Basic ${Buffer.from("api-user:api-password").toString("base64")}`);
    const body = JSON.parse(init.body);
    assert.equal(body.channel_id, 123);
    assert.equal(body.amount, 1500);
    assert.equal(body.provider, "m-pesa");
    assert.equal(body.external_reference, "WCH-ABCDEF");
    assert.equal(body.callback_url, `https://shop.example/api/payhero/callback/${"s".repeat(40)}`);
    return Response.json({ success: true, reference: "ph-1", CheckoutRequestID: "checkout-1" }, { status: 201 });
  });
  assert.deepEqual(await stkPush({ phone: "254700000000", amount: 1500, reference: "WCH-ABCDEF", description: "Order" }),
    { checkoutRequestId: "checkout-1", providerReference: "ph-1" });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("missing credentials never silently enable mock payments", async () => {
  delete process.env.PAYHERO_API_PASSWORD;
  assert.equal(isMockPayments(), false);
  await assert.rejects(stkPush({ phone: "254700000000", amount: 100, reference: "order", description: "Order" }), /credentials/);
});

test("local PayHero testing omits the unreachable callback but still sends a real request", async () => {
  process.env.APP_URL = "http://localhost:3000";
  const fetchMock = mock.method(globalThis, "fetch", async (_url: any, init: any) => {
    assert.equal(JSON.parse(init.body).callback_url, undefined);
    return Response.json({ success: true, reference: "ph-local", CheckoutRequestID: "checkout-local" });
  });
  assert.equal(isMockPayments(), false);
  assert.equal((await stkPush({ phone: "254700000000", amount: 1, reference: "demo", description: "Demo" })).providerReference, "ph-local");
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("push rejects incomplete responses and hides provider error bodies", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => Response.json({ success: true, CheckoutRequestID: "id" }));
  const opts = { phone: "254700000000", amount: 100, reference: "order", description: "Order" };
  await assert.rejects(stkPush(opts), /valid payment reference/);
  fetchMock.mock.mockImplementation(async () => Response.json({ error: "private-provider-detail" }, { status: 401 }));
  await assert.rejects(stkPush(opts), (error: Error) => !error.message.includes("private-provider-detail"));
});

test("status checks distinguish queued, failed, paid and mismatched references", async () => {
  let body: any = { reference: "ph-1", status: "QUEUED", success: true };
  const fetchMock = mock.method(globalThis, "fetch", async (url: any) => {
    assert.equal(url, "https://backend.payhero.co.ke/api/v2/transaction-status?reference=ph-1");
    return Response.json(body);
  });
  assert.equal((await stkQuery("checkout-1", "ph-1")).state, "pending");
  body.status = "FAILED";
  assert.equal((await stkQuery("checkout-1", "ph-1")).state, "failed");
  body.status = "SUCCESS";
  assert.equal((await stkQuery("checkout-1", "ph-1")).state, "pending");
  body.provider_reference = "ABC1234567";
  assert.equal((await stkQuery("checkout-1", "ph-1")).receipt, "ABC1234567");
  body.reference = "another-payment";
  assert.equal((await stkQuery("checkout-1", "ph-1")).state, "pending");
  body.reference = "ph-1";
  body.CheckoutRequestID = "wrong-checkout";
  assert.equal((await stkQuery("checkout-1", "ph-1")).state, "pending");
  const before = fetchMock.mock.callCount();
  assert.equal((await stkQuery("legacy-daraja-id")).state, "pending");
  assert.equal(fetchMock.mock.callCount(), before);
});

test("production accepts PayHero credentials without Daraja settings", () => {
  const env = {
    NODE_ENV: "production", AUTH_SECRET: "a".repeat(40), JOBS_SECRET: "j".repeat(40), PAYHERO_CALLBACK_SECRET: "s".repeat(40),
    PAYHERO_API_USERNAME: "username", PAYHERO_API_PASSWORD: "password", PAYHERO_CHANNEL_ID: "123",
    APP_URL: "https://shop.example", DATABASE_URL: "mongodb://example/store",
    MAIL_HOST: "smtp.example", MAIL_USERNAME: "user", MAIL_PASSWORD: "password", MAIL_ENCRYPTION: "tls", ADMIN_EMAILS: "admin@example.com",
    AUTH_TRUSTED_IP_HEADER: "x-real-ip",
  } as NodeJS.ProcessEnv;
  assert.doesNotThrow(() => validateProductionEnv(env));
  assert.throws(() => validateProductionEnv({ ...env, PAYHERO_CHANNEL_ID: "0" }), /PAYHERO_CHANNEL_ID/);
});

test("callbacks reject null result codes, bad secrets, reference and amount mismatches", async () => {
  const response = { CheckoutRequestID: "checkout-1", ExternalReference: "WCH-ABCDEF", ResultCode: 0,
    Amount: 100, MpesaReceiptNumber: "ABC1234567", Phone: "254700000000" };
  assert.equal(payheroCallbackSchema.safeParse({ response: { ...response, ResultCode: null } }).success, false);
  const request = () => new Request("https://shop.example/callback", { method: "POST", body: JSON.stringify({ response }) });
  assert.equal((await POST(request(), { params: Promise.resolve({ secret: "wrong" }) })).status, 401);
  mock.method(db.paymentAttempt, "findUnique", async () => ({ requestId: "checkout-1", providerReference: "ph-1", orderId: "order-1", amount: 1500, phone: "254700000000" }));
  mock.method(db.order, "findUnique", async () => ({ id: "order-1", number: "WCH-ABCDEF", total: 1500 }));
  mock.method(globalThis, "fetch", async () => Response.json({ reference: "ph-1", status: "SUCCESS", success: true, provider_reference: "ABC1234567" }));
  const params = { params: Promise.resolve({ secret: "s".repeat(40) }) };
  assert.equal((await POST(request(), params)).status, 400);
  response.Amount = 1500;
  response.ExternalReference = "another-order";
  assert.equal((await POST(request(), params)).status, 400);
});

import "./database";
import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { findPaymentOrder, markFailed, markPaid, PaymentBusyError, requestPayment } from "../src/lib/orders";
import { processOrderMailJobs } from "../src/lib/order-mail";

afterEach(() => mock.restoreAll());

// Database methods are substituted: these regressions never contact the configured database.
function transaction() { mock.method(db, "$transaction", async (fn: any) => fn(db)); }

test("only one concurrent retry obtains a payment claim and creates a prompt", async () => {
  transaction();
  process.env.MPESA_MODE = "mock";
  const order = { id: "order-id", number: "WCH-ABCDEF", total: 1500, mpesaPhone: "254700000000" };
  mock.method(db.order, "findUnique", async () => ({ ...order, checkoutRequestId: "older-request" }));
  let claimed = false;
  mock.method(db.order, "updateMany", async ({ where }: any) => {
    if (where.checkoutRequestId) return { count: 1 };
    if (claimed) return { count: 0 };
    claimed = true;
    return { count: 1 };
  });
  const retain = mock.method(db.paymentAttempt, "upsert", async () => ({}));
  const create = mock.method(db.paymentAttempt, "create", async () => ({}));
  mock.method(db.paymentAttempt, "update", async () => ({}));
  const results = await Promise.allSettled([requestPayment(order), requestPayment(order)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  assert.ok(rejected.reason instanceof PaymentBusyError);
  assert.equal(create.mock.callCount(), 1);
  assert.equal((retain.mock.calls[0].arguments[0] as any).where.requestId, "older-request");
});

test("a late callback still resolves after a newer prompt replaced the order reference", async () => {
  mock.method(db.paymentAttempt, "findUnique", async () => ({ orderId: "order-id" }));
  mock.method(db.order, "findUnique", async ({ where }: any) => where.id === "order-id" ? { id: "order-id", checkoutRequestId: "newer-request" } : null);
  assert.equal((await findPaymentOrder("older-request"))?.id, "order-id");
});

test("failed or insufficient callbacks cannot downgrade paid orders or fail a newer prompt", async () => {
  transaction();
  mock.method(db.paymentAttempt, "updateMany", async () => ({ count: 1 }));
  let order = { id: "order-id", status: "DISPATCHED", checkoutRequestId: "newer-request" };
  mock.method(db.order, "updateMany", async ({ where, data }: any) => {
    if (order.status !== where.status || order.checkoutRequestId !== where.checkoutRequestId) return { count: 0 };
    order = { ...order, ...data };
    return { count: 1 };
  });
  const event = mock.method(db.orderEvent, "create", async () => ({}));
  await markFailed(order.id, "Underpayment", "newer-request");
  assert.equal(order.status, "DISPATCHED");
  order.status = "PENDING_PAYMENT";
  await markFailed(order.id, "Older prompt failed", "older-request");
  assert.equal(order.status, "PENDING_PAYMENT");
  assert.equal(event.mock.callCount(), 0);
});

test("replayed success callbacks create one paid event and one email job per recipient", async () => {
  transaction();
  process.env.ADMIN_EMAILS = "staff@example.com";
  let status = "PENDING_PAYMENT";
  mock.method(db.paymentAttempt, "updateMany", async () => ({ count: 1 }));
  mock.method(db.order, "updateMany", async ({ where }: any) => {
    if (!where.status?.in?.includes(status)) return { count: 0 };
    status = "PAID";
    return { count: 1 };
  });
  mock.method(db.order, "findUnique", async () => ({ customerEmail: "owner@example.com" }));
  const event = mock.method(db.orderEvent, "create", async () => ({}));
  const jobs = mock.method(db.orderMailJob, "upsert", async () => ({}));
  await markPaid("order-id", "ABC1234567", "request-id");
  await markPaid("order-id", "ABC1234567", "request-id");
  assert.equal(event.mock.callCount(), 1);
  assert.equal(jobs.mock.callCount(), 2);
});

test("missing mail configuration retains the job for retry without marking it sent", async () => {
  delete process.env.MAIL_HOST;
  mock.method(db.orderMailJob, "findMany", async () => [{ id: "job-id", orderId: "order-id", recipient: "owner@example.com", kind: "customer", attempts: 0 }]);
  mock.method(db.orderMailJob, "updateMany", async () => ({ count: 1 }));
  mock.method(db.order, "findUnique", async () => ({ id: "order-id" }));
  const update = mock.method(db.orderMailJob, "update", async () => ({}));
  mock.method(console, "error", () => {});
  const result = await processOrderMailJobs();
  assert.equal(result.sent, 0);
  const data = (update.mock.calls[0].arguments[0] as any).data;
  assert.ok(data.availableAt > new Date());
  assert.equal(data.sentAt, undefined);
});

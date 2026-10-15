import "./database";
import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { orderInput } from "../src/lib/validation";
import { nextActions, trackerSteps } from "../src/lib/order-status";
import { requestPayment, refreshPayment } from "../src/lib/orders";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { NextResponse } from "next/server";
import { normalizePhone } from "../src/lib/format";
import { db } from "../src/lib/db";

afterEach(() => mock.restoreAll());
const input = { customerName: "Test Customer", phone: "0712345678", deliveryMethod: "PICKUP", items: [{ productId: "product-1", size: "M", qty: 1 }] };

test("cash needs contact details but no M-Pesa number; M-Pesa still validates its number", () => {
  assert.equal(orderInput.safeParse({ ...input, paymentMethod: "CASH" }).success, true);
  assert.equal(orderInput.safeParse({ ...input, paymentMethod: "CASH", phone: "" }).success, false);
  assert.equal(orderInput.safeParse({ ...input, paymentMethod: "MPESA" }).success, false);
  assert.equal(orderInput.parse({ ...input, mpesaPhone: "0712345678" }).paymentMethod, "MPESA");
  assert.equal(orderInput.safeParse({ ...input, paymentMethod: "CARD" }).success, false);
});

test("cash orders progress through preparation and cash collection before completion", () => {
  const order = { paymentMethod: "CASH", status: "CASH_PENDING", hasCustom: true, deliveryMethod: "PICKUP" };
  assert.deepEqual(nextActions(order), ["SEWING", "CANCELLED"]);
  assert.deepEqual(nextActions({ ...order, status: "SEWING" }), ["READY", "CANCELLED"]);
  assert.deepEqual(nextActions({ ...order, status: "READY" }), ["PAID", "CANCELLED"]);
  assert.deepEqual(nextActions({ ...order, status: "PAID" }), ["DELIVERED", "CANCELLED"]);
  assert.equal(trackerSteps({ ...order, status: "READY" }).find(s => s.status === "PAID")?.done, false);
  assert.deepEqual(nextActions({ ...order, hasCustom: false, deliveryMethod: "COUNTY" }), ["DISPATCHED", "CANCELLED"]);
  assert.deepEqual(nextActions({ ...order, paymentMethod: "MPESA", status: "PENDING_PAYMENT" }), ["PAID", "CANCELLED"]);
});

test("cash payment helpers never access a gateway or create attempts", async () => {
  await assert.rejects(requestPayment({ id: "order-1", number: "WCH-ABCDEF", total: 1500, mpesaPhone: "", paymentMethod: "CASH" }), /payable in cash/);
  await refreshPayment({ id: "order-1", status: "PENDING_PAYMENT", checkoutRequestId: null, paymentCheckedAt: null, paymentMethod: "CASH" });
});

test("cash checkout creates an unpaid order with no payment prompt", async () => {
  const dependencies: Record<string, unknown> = {
    "next/server": { NextResponse },
    "@/lib/customer": { currentCustomer: async () => ({ uid: "customer-1", email: "customer@example.com" }) },
    "@/lib/db": { db },
    "@/lib/format": { normalizePhone },
    "@/lib/orders": { newOrderNumber: () => "WCH-ABCDEF", requestPayment: async () => { throw new Error("Cash must never request payment"); } },
    "@/lib/pricing": { PricingError: Error, priceOrder: async () => ({ lines: [], subtotal: 1500, deliveryFee: 0, total: 1500, hasCustom: false }) },
    "@/lib/validation": { orderInput },
  };
  const code = ts.transpileModule(readFileSync("src/app/api/orders/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} as { POST: (request: Request) => Promise<Response> } };
  new Function("require", "exports", "module", code)((key: string) => {
    if (!(key in dependencies)) throw new Error(`Unexpected dependency ${key}`);
    return dependencies[key];
  }, module.exports, module);
  const create = mock.method(db.order, "create", async ({ data }: any) => ({ ...data, id: "order-1" }));
  const result = await module.exports.POST(new Request("https://shop.example/api/orders", { method: "POST", body: JSON.stringify({ ...input, paymentMethod: "CASH" }) }));
  assert.equal(result.status, 200);
  const data = (create.mock.calls[0].arguments[0] as any).data;
  assert.equal(data.paymentMethod, "CASH");
  assert.equal(data.status, "CASH_PENDING");
  assert.equal(data.mpesaPhone, "");
  assert.equal(data.paidAt, undefined);
});

import "./database";
import { afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { db } from "../src/lib/db";
import { paymentTransaction } from "../src/lib/payment-transaction";

afterEach(() => mock.restoreAll());

test("payment transaction retries aborted conflicts with a longer database timeout", async () => {
  let calls = 0;
  mock.method(db, "$transaction", async (work: any, options: any) => {
    assert.equal(options.timeout, 15000);
    if (++calls < 3) throw Object.assign(new Error("conflict"), { code: "P2034" });
    return work(db);
  });
  assert.equal(await paymentTransaction(async () => "committed"), "committed");
  assert.equal(calls, 3);
});

test("payment transaction does not retry unknown failures and bounds conflict retries", async () => {
  const tx = mock.method(db, "$transaction", async () => { throw Object.assign(new Error("timeout"), { code: "P2028" }); });
  await assert.rejects(paymentTransaction(async () => {}), /timeout/);
  assert.equal(tx.mock.callCount(), 1);
  tx.mock.mockImplementation(async () => { throw Object.assign(new Error("conflict"), { code: "P2034" }); });
  await assert.rejects(paymentTransaction(async () => {}), /conflict/);
  assert.equal(tx.mock.callCount(), 4);
});

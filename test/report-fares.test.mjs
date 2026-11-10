// tc-0024: the FARES of a Clover shift report - the Service Fee never on the driver's report. Supabase replaced by a fake.
import { test, mock } from "node:test";
import assert from "node:assert/strict";
let rows = [], err = null, asked = null;
mock.module("@/lib/supabase", { namedExports: { db: () => ({ from: () => ({ select: () => ({ in: async (col, refs) => { asked = refs; return { data: rows, error: err }; } }) }) }) } });
const { cloverFares, payView } = await import("../lib/data/reportPay.js");

test("F1 each payment less its Service Fee, refunds taken off, voided and reversed out", async () => {
  rows = [
    { clover_payment_id: "A", total: 24.73, refunded: 0, service_fee: 1.18, voided: false, status: "credited" },
    { clover_payment_id: "B", total: 10.50, refunded: 5.25, service_fee: 0.50, voided: false, status: "credited" },
    { clover_payment_id: "C", total: 21.00, refunded: 0, service_fee: 1.00, voided: true, status: "reversed" },
    { clover_payment_id: "D", total: 20.00, refunded: 0, service_fee: 0, voided: false, status: "credited" },
  ];
  assert.equal(await cloverFares(["A", "B", "C", "D"]), 23.55 + 5.00 + 20.00);
  assert.deepEqual(asked, ["A", "B", "C", "D"]);
});

test("F2 nothing to work from -> null (the terminal works it out from the card total)", async () => {
  assert.equal(await cloverFares([]), null);
  assert.equal(await cloverFares(undefined), null);
  err = { message: "boom" }; assert.equal(await cloverFares(["A"]), null); err = null;
});

test("F3 the driver's view of a report has no Service Fee and no card total", () => {
  const v = payView({ reportId: "r", number: "SR-1", provider: "clover", driverId: "d", items: [], toPay: { payments: 1, amount: 23.55, card: 24.73, serviceFee: 1.18, commission: 0, refunded: 0 } });
  assert.deepEqual(v.toPay, { payments: 1, amount: 23.55, fares: 23.55, commission: 0, refunded: 0 });
});

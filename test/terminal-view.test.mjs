// tc-0013 tests: TaxiCharg shows what matches the driver's TERMINALS, each side only its own money.
//   node --import ./test/register.mjs --experimental-test-module-mocks --test test/terminal-view.test.mjs
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { terminalView, cloverPaymentRows, cloverMoney, cloverPaymentKey } from "../lib/money/clover.js";

// ---- which side he sees ------------------------------------------------------------------
test("V1 no terminal: nothing", () => {
  assert.deepEqual(terminalView([]), { clover: false, stripe: false, none: true });
  assert.deepEqual(terminalView(undefined), { clover: false, stripe: false, none: true });
});
test("V2 an active Clover: Clover only, Stripe silent", () => {
  assert.deepEqual(terminalView([{ status: "active", brand: "clover" }]), { clover: true, stripe: false, none: false });
});
test("V3 an active S710: Stripe only", () => {
  assert.deepEqual(terminalView([{ status: "active", brand: "stripe_s710" }]), { clover: false, stripe: true, none: false });
});
test("V4 both active: both", () => {
  assert.deepEqual(terminalView([{ status: "active", brand: "clover" }, { status: "active", brand: "stripe_s710" }]), { clover: true, stripe: true, none: false });
});
test("V5 moved off Clover (returned / spare / faulty): Clover gone at once", () => {
  for (const st of ["returned", "spare", "faulty"]) {
    assert.deepEqual(terminalView([{ status: st, brand: "clover" }, { status: "active", brand: "stripe_s710" }]), { clover: false, stripe: true, none: false });
  }
});
test("V6 an old row with no brand counts as Clover; 'other' hardware shows nothing", () => {
  assert.equal(terminalView([{ status: "active" }]).clover, true);
  assert.deepEqual(terminalView([{ status: "active", brand: "other" }]), { clover: false, stripe: false, none: true });
});

// ---- the Clover money trail (shapes written by FareTap 317 / 281) ------------------------
const D = "d-1";
const L = (id, at, direction, kind, amount, extra = {}) => ({ id, entry_at: at, direction, kind, amount, source: "clover", ...extra });
const sale100 = [
  L("t1", "2026-10-30T11:00:00Z", "in", "takings", 100, { external_ref: "PAY1" }),
  L("f1", "2026-10-30T11:00:00Z", "out", "service_fee", 5, { external_ref: "servicefee:PAY1" }),
  L("c1", "2026-10-30T11:00:00Z", "in", "commission", 1.5, { external_ref: "commission:PAY1" }),
];
const voided10 = [
  L("t2", "2026-10-30T12:00:00Z", "in", "takings", 10, { external_ref: "PAY2" }),
  L("f2", "2026-10-30T12:00:00Z", "out", "service_fee", 0.5, { external_ref: "servicefee:PAY2" }),
  L("r2a", "2026-10-30T12:01:00Z", "out", "adjustment", 10, { reference: "PAY2", reverses_id: "t2" }),
  L("r2b", "2026-10-30T12:01:00Z", "in", "adjustment", 0.5, { reference: "PAY2", reverses_id: "f2" }),
];
const refunded50 = [
  L("t3", "2026-10-29T09:00:00Z", "in", "takings", 50, { external_ref: "PAY3" }),
  L("f3", "2026-10-29T09:00:00Z", "out", "service_fee", 2.5, { external_ref: "servicefee:PAY3" }),
  L("x3", "2026-10-29T10:00:00Z", "out", "refund", 20, { reference: "PAY3", external_ref: "refund:R1" }),
  L("y3", "2026-10-29T10:00:00Z", "in", "adjustment", 1, { reference: "PAY3", external_ref: "refund-servicefee:R1" }),
];

test("M1 one row per Clover sale: fare, 5% Service fee, his commission, net", () => {
  const [r] = cloverPaymentRows(sale100, D);
  assert.equal(r.total, 100); assert.equal(r.fee, 5); assert.equal(r.commission, 1.5); assert.equal(r.net, 96.5);
  assert.equal(r.status, "settled"); assert.equal(r.transactions, 1);
});
test("M2 a voided sale shows as voided and puts nothing in his balance", () => {
  const [r] = cloverPaymentRows(voided10, D);
  assert.equal(r.status, "voided"); assert.equal(r.net, 0); assert.equal(r.total, 10);
});
test("M3 a refund rides on its sale", () => {
  const rows = cloverPaymentRows(refunded50, D);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].refunded, true); assert.equal(rows[0].refundAmount, 20); assert.equal(rows[0].net, 28.5);
});
test("M4 newest first, three sales three rows", () => {
  const rows = cloverPaymentRows([...refunded50, ...sale100, ...voided10], D);
  assert.deepEqual(rows.map((r) => r.id), ["t2", "t1", "t3"]);
});
test("M5 first-version fee names (cardfee:) still join their sale", () => {
  assert.equal(cloverPaymentKey({ external_ref: "cardfee:PAY9" }), "PAY9");
  assert.equal(cloverPaymentKey({ external_ref: "PAY9" }), "PAY9");
  assert.equal(cloverPaymentKey({ external_ref: "refund:R9", reference: "PAY9" }), "PAY9");
});

// ---- the Clover balance --------------------------------------------------------------------
const lines = [...sale100, ...voided10, ...refunded50];   // net 96.50 + 0 + 28.50 = 125.00
test("B1 a SYD CABS driver: only Clover money counts, never his job takings", () => {
  const m = cloverMoney({ role: "driver", walletBalance: 1270, cloverLines: lines, reportLines: [], paidHere: 0, pendingHere: 0, pendingAll: 0 });
  assert.equal(m.balance, 125); assert.equal(m.available, 125);
});
test("B2 Clover cash-outs paid here come off", () => {
  const m = cloverMoney({ role: "driver", walletBalance: 1270, cloverLines: lines, reportLines: [], paidHere: 100, pendingHere: 0, pendingAll: 0 });
  assert.equal(m.available, 25);
});
test("B3 a request still waiting is held back", () => {
  const m = cloverMoney({ role: "both", walletBalance: 1270, cloverLines: lines, reportLines: [], paidHere: 0, pendingHere: 25, pendingAll: 25 });
  assert.equal(m.available, 100); assert.equal(m.pendingWithdrawals, 25);
});
test("B4 never more than the wallet holds after every open request (SYD CABS app ones too)", () => {
  const m = cloverMoney({ role: "driver", walletBalance: 60, cloverLines: lines, reportLines: [], paidHere: 0, pendingHere: 0, pendingAll: 40 });
  assert.equal(m.available, 20);
});
test("B5 never below zero", () => {
  const m = cloverMoney({ role: "driver", walletBalance: -50, cloverLines: lines, reportLines: [], paidHere: 0, pendingHere: 0, pendingAll: 0 });
  assert.equal(m.available, 0); assert.ok(m.balance >= 0);
});
test("B6 a TaxiCharg terminal user: his wallet is all Clover money", () => {
  const m = cloverMoney({ role: "terminal", walletBalance: 270, cloverLines: [], reportLines: [], paidHere: 0, pendingHere: 30, pendingAll: 30 });
  assert.equal(m.balance, 270); assert.equal(m.available, 240);
});
test("B7 report lines (a Clover takings report) count on the Clover side", () => {
  const rl = [{ direction: "in", amount: 80 }, { direction: "out", amount: 4 }];
  const m = cloverMoney({ role: "driver", walletBalance: 500, cloverLines: [], reportLines: rl, paidHere: 0, pendingHere: 0, pendingAll: 0 });
  assert.equal(m.available, 76);
});

// ---- cash out on this site ------------------------------------------------------------------
let session; let summary; const recorded = [];
mock.module("@/lib/driverSession", { namedExports: { requireDriverSession: async () => session } });
mock.module("@/lib/data/payments", { namedExports: { getDriverSummary: async () => summary } });
mock.module("@/lib/data/withdrawals", { namedExports: { recordWithdrawal: async (id, x) => { recorded.push({ id, ...x }); return { id: "pr-1" }; } } });
const withdraw = await import("@/app/api/driver/withdraw/route.js");
const req = (amount) => new Request("https://x/api/driver/withdraw", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amount }) });

test("W1 no Clover terminal: cash out refused, nothing requested", async () => {
  session = { driver: { id: D, view: { clover: false, stripe: true } } }; summary = { availableBalance: 999 };
  const r = await withdraw.POST(req(10));
  assert.equal(r.status, 403); assert.equal(recorded.length, 0);
});
test("W2 Clover terminal: more than the Clover balance refused", async () => {
  session = { driver: { id: D, view: { clover: true, stripe: false } } }; summary = { availableBalance: 25 };
  const r = await withdraw.POST(req(30));
  assert.equal(r.status, 400); assert.equal(recorded.length, 0);
});
test("W3 Clover terminal: within the Clover balance goes to the office queue", async () => {
  const r = await withdraw.POST(req(25));
  assert.equal(r.status, 200); assert.equal(recorded.length, 1); assert.equal(recorded[0].amount, 25);
});

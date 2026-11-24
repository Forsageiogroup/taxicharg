// tc-0025 tests: GET PAID on an S710 shift report goes to the driver's bank as an INSTANT payout (the owner, 25 Nov 2026:
// "in clover cash out it work manual, and in stripe it work automatic"); the free payout only when it cannot go instantly.
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

const S = { creates: [], payouts: [], ext: [{ available_payout_methods: ["standard", "instant"] }], failNext: null, balance: null };
class FakeStripe {
  balanceSettings = { update: async () => ({}) };
  balance = { retrieve: async () => S.balance };
  payouts = {
    list: async () => ({ data: S.payouts }),
    create: async (p, o) => {
      if (S.failNext) { const e = Object.assign(new Error("stripe says no"), { code: S.failNext }); S.failNext = null; throw e; }
      const dup = S.creates.find((c) => c.o.idempotencyKey === o.idempotencyKey);
      if (dup) return dup.po;
      const po = { id: "po_" + (S.creates.length + 1), amount: p.amount, method: p.method || "standard", status: "pending",
        application_fee_amount: p.method === "instant" ? Math.max(50, Math.round(p.amount / 100)) : null, created: Math.floor(Date.now() / 1000), arrival_date: 1793664000 };
      S.creates.push({ p, o, po }); S.payouts.unshift(po); return po;
    },
  };
  accounts = { listExternalAccounts: async () => ({ data: S.ext }) };
}
mock.module("stripe", { defaultExport: FakeStripe });
let account = { account_id: "acct_1", status: "ready", livemode: false };
mock.module("@/lib/data/stripeAccounts", { namedExports: { getPayoutAccount: async () => account } });
mock.module("@/lib/data/terminalPay", { namedExports: { cardPaymentsForDriver: async () => [] } });

const M = await import("../lib/terminal/cardMoney.js");
const I = await import("../lib/money/instantCashout.js");
const D = { id: "d1", name: "Test Driver", status: "active" };
const REQ = "req_1234567890abcdef";
// Stripe's instant balance: gross, and what can go to the bank after the 1% (min 50c) fee
const inst = (gross) => ({ currency: "aud", amount: gross, net_available: [{ amount: I.instantNetOf(gross), destination: "ba_1" }] });

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_x"; process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x"; delete process.env.TC_STRIPE_LIVE;
  for (const k of ["TC_INSTANT_CASHOUT", "TC_INSTANT_FEE_PCT", "TC_INSTANT_FEE_MIN_CENTS", "TC_INSTANT_DAY_MAX_CENTS"]) delete process.env[k];
  S.creates.length = 0; S.payouts.length = 0; S.failNext = null; account = { account_id: "acct_1", status: "ready", livemode: false };
  S.balance = { available: [{ currency: "aud", amount: 2910 }], pending: [], instant_available: [inst(2910)] };
});

test("I1 the fee comes out of the report: what reaches the bank + the fee = the report, never more", () => {
  assert.equal(I.instantNetOf(2910), 2860);   // $29.10 -> $28.60 + the $0.50 minimum fee
  assert.equal(I.instantNetOf(7350), 7277);   // $73.50 -> $72.77 + $0.73
  assert.equal(I.instantNetOf(200), 150);     // the 50c minimum fee
  assert.equal(I.instantNetOf(40), 0);
  for (let t = 1; t <= 20000; t += 7) {
    const x = I.instantNetOf(t);
    if (x > 0) { assert.ok(x + I.instantFeeCents(x) <= t, String(t)); assert.ok(x + 1 + I.instantFeeCents(x + 1) > t, String(t)); }
  }
});

test("I2 S710 GET PAID: one INSTANT payout of the report less the fee, with its own key - no free payout", async () => {
  const r = await M.getPaidOut(D, { requestId: REQ, amountCents: 2910 });
  assert.equal(r.status, 200); assert.equal(r.method, "instant"); assert.equal(r.toBankCents, 2860); assert.equal(r.feeCents, 50);
  assert.equal(S.creates.length, 1); assert.equal(S.creates[0].p.method, "instant"); assert.equal(S.creates[0].p.amount, 2860);
  assert.equal(S.creates[0].o.idempotencyKey, "tcinst_" + REQ);
  const again = await M.getPaidOut(D, { requestId: REQ, amountCents: 2910 });   // a retry of the same press
  assert.equal(again.status, 200); assert.equal(S.creates.length, 1);
});

test("I3 his bank cannot take instant payouts: the free payout of the whole report, and why", async () => {
  S.failNext = "instant_payouts_unsupported";
  const r = await M.getPaidOut(D, { requestId: REQ, amountCents: 2910 });
  assert.equal(r.status, 200); assert.equal(r.method, "standard"); assert.equal(r.toBankCents, 2910); assert.equal(r.feeCents, 0);
  assert.match(r.instantWhy, /cannot take instant/);
  assert.equal(S.creates.length, 1); assert.equal(S.creates[0].p.method, undefined); assert.equal(S.creates[0].o.idempotencyKey, "tccash_" + REQ);
});

test("I4 not instantly available yet / switched off / today's limit: the free payout instead", async () => {
  S.balance = { available: [{ currency: "aud", amount: 2910 }], pending: [], instant_available: [] };
  let r = await M.getPaidOut(D, { requestId: REQ, amountCents: 2910 });
  assert.equal(r.method, "standard"); assert.equal(S.creates.at(-1).p.amount, 2910);
  S.balance = { available: [{ currency: "aud", amount: 2910 }], pending: [], instant_available: [inst(2910)] };
  process.env.TC_INSTANT_CASHOUT = "off";
  r = await M.getPaidOut(D, { requestId: "req_offoffoffoffoffoff", amountCents: 2910 });
  assert.equal(r.method, "standard"); assert.match(r.instantWhy, /switched off/);
  delete process.env.TC_INSTANT_CASHOUT; process.env.TC_INSTANT_DAY_MAX_CENTS = "50";
  r = await M.getPaidOut(D, { requestId: "req_limitlimitlimitlim", amountCents: 2910 });
  assert.equal(r.method, "standard"); assert.match(r.instantWhy, /limit/);
});

test("I5 an unexplained Stripe failure: no second payout on top - the error goes back (368 lets the payments go)", async () => {
  S.failNext = "api_connection_error";
  const r = await M.getPaidOut(D, { requestId: REQ, amountCents: 2910 });
  assert.ok(r.error); assert.ok(r.status >= 500); assert.equal(S.creates.length, 0);
});

test("I6 neither way possible (nothing available): an error, nothing paid", async () => {
  S.balance = { available: [], pending: [{ currency: "aud", amount: 2910 }], instant_available: [] };
  const r = await M.getPaidOut(D, { requestId: REQ, amountCents: 2910 });
  assert.ok(r.error); assert.equal(S.creates.length, 0);
});

test("I7 checks before Stripe: press id, at least $1, keys, a ready payout account", async () => {
  assert.equal((await M.getPaidOut(D, { requestId: "x", amountCents: 2910 })).status, 400);
  assert.equal((await M.getPaidOut(D, { requestId: REQ, amountCents: 99 })).status, 400);
  account = null; assert.equal((await M.getPaidOut(D, { requestId: REQ, amountCents: 2910 })).status, 409);
  account = { account_id: "acct_1", status: "pending" }; assert.equal((await M.getPaidOut(D, { requestId: REQ, amountCents: 2910 })).status, 409);
  account = { account_id: "acct_1", status: "ready" }; process.env.STRIPE_SECRET_KEY = "";
  assert.equal((await M.getPaidOut(D, { requestId: REQ, amountCents: 2910 })).status, 503);
  assert.equal(S.creates.length, 0);
});

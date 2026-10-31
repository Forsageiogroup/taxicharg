// tc-0015 tests: card fares on the TaxiCharg S710 - the money split, the app's four steps, the
// transfer of the driver's share, refunds, disputes, the webhook and the daily sweep - with Stripe
// and the database replaced by fakes (the database fake keeps 320's rules: one open or paid payment
// per trip, a request id once). Run with the other tests: npm test
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// ---- fake Stripe --------------------------------------------------------------------------
const S = { intents: new Map(), charges: new Map(), transfers: [], reversals: [], tokens: [], cancels: [], creates: [], n: 0 };
const id = (p) => `${p}_${(++S.n).toString(36).padStart(6, "0")}`;
class FakeStripe {
  constructor(key) { this.key = key; }
  terminal = {
    readers: { retrieve: async (r) => ({ id: r, location: "tml_GuHWDwIBxJZmvN" }) },
    connectionTokens: { create: async (p) => { S.tokens.push(p); return { secret: "pst_test_secret" }; } },
  };
  paymentIntents = {
    create: async (p, o) => {
      S.creates.push({ p, o });
      const pi = { id: id("pi"), object: "payment_intent", amount: p.amount, status: "requires_payment_method", client_secret: "pi_secret_" + S.n, metadata: p.metadata, latest_charge: null };
      S.intents.set(pi.id, pi); return { ...pi };
    },
    retrieve: async (pid) => { const pi = S.intents.get(pid); if (!pi) throw new Error("no such intent"); return { ...pi, latest_charge: pi.latest_charge ? { ...S.charges.get(pi.latest_charge) } : null }; },
    cancel: async (pid) => { S.cancels.push(pid); const pi = S.intents.get(pid); if (pi.status === "succeeded" || pi.status === "processing") throw new Error(`cannot cancel a ${pi.status} intent`); pi.status = "canceled"; return { ...pi }; },
  };
  disputes = { retrieve: async (d) => ({ id: d, status: S.disputeStatus || "lost" }) };
  charges = { retrieve: async (c) => ({ ...S.charges.get(c) }) };
  transfers = {
    list: async (q) => ({ data: S.transfers.filter((t) => t.p.transfer_group === q.transfer_group).map((t) => ({ ...t.tr })) }),
    retrieve: async (trId) => { const t = S.transfers.find((x) => x.tr.id === trId); return { ...t.tr, amount_reversed: S.reversals.filter((r) => r.trId === trId).reduce((a, r) => a + r.p.amount, 0) }; },
    create: async (p, o) => {
      const dup = S.transfers.find((t) => t.o.idempotencyKey === o.idempotencyKey);
      if (dup) return dup.tr;
      const tr = { id: id("tr"), amount: p.amount, destination: p.destination }; S.transfers.push({ p, o, tr }); return tr;
    },
    createReversal: async (trId, p, o) => {
      if (S.reversals.find((r) => r.o.idempotencyKey === o.idempotencyKey)) return {};
      S.reversals.push({ trId, p, o }); return { id: id("trr") };
    },
  };
  webhooks = { constructEvent: (raw) => JSON.parse(raw) };
}
mock.module("stripe", { defaultExport: FakeStripe });
/** The passenger taps a card on the reader: Stripe now holds a paid charge. */
function tap(piId, { brand = "visa", last4 = "4242" } = {}) {
  const pi = S.intents.get(piId);
  const ch = { id: id("ch"), object: "charge", amount: pi.amount, amount_refunded: 0, disputed: false, payment_intent: piId, payment_method_details: { card_present: { brand, last4 } } };
  S.charges.set(ch.id, ch); pi.status = "succeeded"; pi.latest_charge = ch.id; return ch;
}

let allow = true;
const { NextResponse } = await import("next/server");
mock.module("@/lib/protect", { namedExports: { rateHit: async () => allow, tooMany: (m) => NextResponse.json({ error: m }, { status: 429 }), clientIp: () => "x" } });

// ---- fake database (320's rules) ----------------------------------------------------------
const D = { terminals: [], drivers: new Map(), terms: new Map(), accounts: new Map(), trips: [], pays: [], events: new Map() };
const hash = (k) => createHash("sha256").update(k).digest("hex");
const clone = (r) => (r ? JSON.parse(JSON.stringify(r)) : null);
const ACTIVE = ["created", "processing", "succeeded"];
mock.module("@/lib/data/terminalPay", { namedExports: {
  keyHash: hash,
  isKey: (k) => typeof k === "string" && /^[0-9a-f]{64}$/.test(k),
  terminalByKey: async (k) => clone(D.terminals.find((t) => t.hash === hash(k) && t.status !== "returned") || null),
  driverForPay: async (d) => clone(D.drivers.get(d) || null),
  commissionRateFor: async (d) => D.terms.get(d) || 0,
  payoutAccountFor: async (d) => clone(D.accounts.get(d) || null),
  meterTripForTaxi: async (taxi) => clone(D.trips.filter((m) => m.taxi_id === taxi && m.status !== "cancelled").at(-1) || null),
  paymentByRequest: async (r) => clone(D.pays.find((p) => p.request_id === r) || null),
  paymentById: async (i) => clone(D.pays.find((p) => p.id === i) || null),
  paymentByIntent: async (i) => { if (D.dbDown) throw new Error("The card payment could not be read."); return clone(D.pays.find((p) => p.payment_intent_id === i) || null); },
  paymentByCharge: async (c) => clone(D.pays.find((p) => p.charge_id === c) || null),
  activePaymentForTrip: async (t) => clone(D.pays.find((p) => p.meter_trip_id === t && ACTIVE.includes(p.status)) || null),
  insertPayment: async (row) => {
    if (D.pays.find((p) => p.request_id === row.request_id)) return { clash: "request" };
    if (row.meter_trip_id && D.pays.find((p) => p.meter_trip_id === row.meter_trip_id && ACTIVE.includes(p.status))) return { clash: "trip" };
    // 320's checks
    assert.equal(row.amount_cents, row.fare_cents + row.surcharge_cents, "amount = fare + surcharge");
    assert.ok(row.commission_cents <= row.surcharge_cents, "commission <= surcharge");
    assert.equal(row.driver_share_cents, row.fare_cents + row.commission_cents, "share = fare + commission");
    assert.ok(row.surcharge_pct <= 5 && row.commission_rate <= 0.05);
    const r = { id: "pay-" + (D.pays.length + 1), status: "created", payment_intent_id: null, charge_id: null, transfer_id: null, transfer_status: "none", transfer_attempts: 0, refunded_cents: 0, reversed_cents: 0, disputed: false, created_at: new Date().toISOString(), ...row };
    D.pays.push(r); return { row: clone(r) };
  },
  updatePayment: async (pid, patch) => {
    if (D.failNextUpdate) { D.failNextUpdate = false; throw new Error("The card payment could not be updated."); }
    const r = D.pays.find((p) => p.id === pid); Object.assign(r, patch, { updated_at: new Date().toISOString() }); return clone(r);
  },
  claimTransfer: async (pid) => { const r = D.pays.find((p) => p.id === pid && p.status === "succeeded" && ["none", "failed"].includes(p.transfer_status)); if (!r) return null; r.transfer_status = "sending"; return clone(r); },
  paymentsToSweep: async () => ({
    toSend: clone(D.pays.filter((p) => p.status === "succeeded" && ["none", "failed", "sending"].includes(p.transfer_status) && p.transfer_attempts < 10)),
    stuck: clone(D.pays.filter((p) => ["created", "processing"].includes(p.status) && p.payment_intent_id)),
    toCheck: clone(D.pays.filter((p) => p.status === "succeeded" && p.charge_id)),
  }),
  claimEvent: async (e) => { if (D.events.has(e.id)) return !D.events.get(e.id); D.events.set(e.id, null); return true; },
  eventHandled: async (eid) => { D.events.set(eid, new Date().toISOString()); },
} });
mock.module("@/lib/data/stripeAccounts", { namedExports: { findPayoutAccountByStripeId: async () => null, saveAccountStatus: async (r) => r } });

const fare = await import("@/lib/money/cardFare");
const route = await import("@/app/api/terminal/route.js");
const webhook = await import("@/app/api/stripe/webhook/route.js");
const sweep = await import("@/app/api/terminal/sweep/route.js");

const KEY = "a".repeat(64), OTHER = "b".repeat(64);
const ASLAM = "d-9001", TAXI = "taxi-stg001";
function post(body) { return route.POST(new Request("https://taxicharg-staging.vercel.app/api/terminal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })); }
async function call(body) { const r = await post({ key: KEY, ...body }); return { status: r.status, j: await r.json() }; }
let reqN = 0; const rid = () => `req_test_${String(++reqN).padStart(8, "0")}`;
function hook(type, object, evId = id("evt")) {
  return webhook.POST(new Request("https://x/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t" }, body: JSON.stringify({ id: evId, type, livemode: false, data: { object } }) }));
}

beforeEach(() => {
  Object.assign(S, { intents: new Map(), charges: new Map(), transfers: [], reversals: [], tokens: [], cancels: [], creates: [] });
  Object.assign(D, { terminals: [], drivers: new Map(), terms: new Map(), accounts: new Map(), trips: [], pays: [], events: new Map() });
  D.terminals.push({ id: "term-s710", serial: "SDR71Z1G618002012", label: "TaxiCharg S710 devkit", status: "active", brand: "stripe_s710", readerId: "tmr_GuHWNAGnCzqVYV", usesCard: true, driverId: ASLAM, taxiId: TAXI, plate: "STG001", hash: hash(KEY) });
  D.drivers.set(ASLAM, { id: ASLAM, full_name: "Aslam Ahmed Sheikh", status: "active" });
  D.terms.set(ASLAM, 0.015);
  D.accounts.set(ASLAM, { account_id: "acct_1Aslam", status: "ready", livemode: false });
  D.trips.push({ id: "trip-10250", taxi_id: TAXI, driver_id: ASLAM, status: "running", total_cents: 0 });
  process.env.STRIPE_SECRET_KEY = "sk_test_x"; process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x";
  delete process.env.TC_STRIPE_LIVE; delete process.env.TC_CARD_SURCHARGE_PCT; delete process.env.TC_TYPED_MAX_CENTS;
  process.env.CRON_SECRET = "cron-test-secret"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"; allow = true;
  S.disputeStatus = null; D.dbDown = false; D.failNextUpdate = false;
});

// ---- the money --------------------------------------------------------------------------
test("F1 the owner's example: meter $100.00, 1.5% -> card $105.00, driver $101.50, TaxiCharg keeps $3.50", () => {
  const s = fare.splitFare(10000, { pct: 5, commissionRate: 0.015 });
  assert.deepEqual([s.amountCents, s.surchargeCents, s.commissionCents, s.driverShareCents, s.keptCents], [10500, 500, 150, 10150, 350]);
});
test("F2 rounding to the cent, half up; no terms -> no commission; a rate above 5% never pays more than the surcharge", () => {
  const a = fare.splitFare(1234, { pct: 5, commissionRate: 0.015 });   // 61.7 -> 62; 18.51 -> 19
  assert.deepEqual([a.surchargeCents, a.commissionCents, a.driverShareCents], [62, 19, 1253]);
  assert.equal(fare.splitFare(2000, { pct: 5, commissionRate: 0 }).driverShareCents, 2000);
  const c = fare.splitFare(10000, { pct: 5, commissionRate: 0.10 });
  assert.deepEqual([c.commissionRate, c.commissionCents, c.driverShareCents], [0.05, 500, 10500]);
  assert.equal(fare.splitFare(10000, { pct: 0, commissionRate: 0.02 }).commissionCents, 0);
});
test("F3 surcharge setting: default 5, never above 5, never below 0", () => {
  assert.equal(fare.surchargePct(), 5);
  process.env.TC_CARD_SURCHARGE_PCT = "7"; assert.equal(fare.surchargePct(), 5);
  process.env.TC_CARD_SURCHARGE_PCT = "2.5"; assert.equal(fare.surchargePct(), 2.5);
  process.env.TC_CARD_SURCHARGE_PCT = "-1"; assert.equal(fare.surchargePct(), 0);
  process.env.TC_CARD_SURCHARGE_PCT = "0"; assert.equal(fare.surchargePct(), 0);
});
test("F4 amounts: $1 minimum, typed at most $500 (setting), whole cents, known kinds only", () => {
  assert.equal(fare.checkFare("typed", 99).ok, false);
  assert.equal(fare.checkFare("typed", 50001).ok, false);
  assert.equal(fare.checkFare("typed", 50000).ok, true);
  assert.equal(fare.checkFare("meter", 150000).ok, true);
  assert.equal(fare.checkFare("typed", 12.5).ok, false);
  assert.equal(fare.checkFare("cash", 1000).ok, false);
  process.env.TC_TYPED_MAX_CENTS = "20000"; assert.equal(fare.checkFare("typed", 20001).ok, false);
});
test("F5 refunds take back the same part of his share, never more than he has", () => {
  const p = { amountCents: 10500, driverShareCents: 10150 };
  assert.equal(fare.reversalFor(p, 5250), 5075);
  assert.equal(fare.reversalFor({ ...p, reversedCents: 5075 }, 10500), 5075);
  assert.equal(fare.reversalFor({ ...p, reversedCents: 10150 }, 10500), 0);
  assert.equal(fare.reversalFor(p, 999999), 10150);
});

// ---- hello and token --------------------------------------------------------------------
test("H1 hello: ready, paid to the allocated driver (first name only), surcharge and limits", async () => {
  const { status, j } = await call({ action: "hello" });
  assert.equal(status, 200);
  assert.equal(j.ready, true); assert.equal(j.driver, "Aslam"); assert.equal(j.plate, "STG001");
  assert.equal(j.surchargePct, 5); assert.equal(j.typedMaxCents, 50000); assert.equal(j.test, true);
  assert.equal(JSON.stringify(j).includes("acct_"), false, "the payout account id never goes to the terminal");
});
test("H2 hello says exactly what is missing", async () => {
  let r = await post({ key: OTHER, action: "hello" }); let j = await r.json();
  assert.equal(j.paired, false); assert.equal(j.problem, "not_paired");
  D.accounts.set(ASLAM, { account_id: "acct_1Aslam", status: "onboarding" });
  assert.equal((await call({ action: "hello" })).j.problem, "payout_not_ready");
  D.terminals[0].driverId = null; assert.equal((await call({ action: "hello" })).j.problem, "no_driver");
  D.terminals[0].brand = "clover"; assert.equal((await call({ action: "hello" })).j.problem, "not_s710");
  D.terminals[0].brand = "stripe_s710"; D.terminals[0].status = "spare"; assert.equal((await call({ action: "hello" })).j.problem, "not_active");
});
test("H3 a live key on this site: no card payments", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_live_x"; process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_x";
  const { j } = await call({ action: "hello" });
  assert.equal(j.ready, false); assert.equal(j.problem, "stripe_off");
  assert.equal((await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 1000 })).status, 409);
});
test("T1 token: only for a paired S710, limited to its location", async () => {
  const { status, j } = await call({ action: "token" });
  assert.equal(status, 200); assert.equal(j.secret, "pst_test_secret");
  assert.deepEqual(S.tokens[0], { location: "tml_GuHWDwIBxJZmvN" });
  assert.equal((await post({ key: OTHER, action: "token" })).status, 403);
  assert.equal((await post({ key: "nothex", action: "token" })).status, 400);
});

// ---- pay ----------------------------------------------------------------------------------
test("P1 pay from the meter: the server splits the fare; Stripe gets the card total, once per press", async () => {
  const r1 = rid();
  const { status, j } = await call({ action: "pay", requestId: r1, source: "meter", fareCents: 10000 });
  assert.equal(status, 200);
  assert.deepEqual([j.fareCents, j.surchargeCents, j.amountCents], [10000, 500, 10500]);
  assert.match(j.clientSecret, /^pi_secret_/);
  const c = S.creates[0];
  assert.equal(c.p.amount, 10500); assert.deepEqual(c.p.payment_method_types, ["card_present"]);
  assert.equal(c.o.idempotencyKey, `tcpi_${r1}`);
  assert.equal(c.p.transfer_group, `tcpay_${D.pays[0].id}`);
  assert.equal(D.pays[0].meter_trip_id, "trip-10250"); assert.equal(D.pays[0].driver_share_cents, 10150);
  assert.equal(D.pays[0].account_id, "acct_1Aslam");
  // the same press again (the answer was lost): the same payment, no second PaymentIntent
  const again = await call({ action: "pay", requestId: r1, source: "meter", fareCents: 10000 });
  assert.equal(again.j.paymentId, j.paymentId); assert.equal(S.creates.length, 1);
});
test("P2 a second press for the same trip stops the first one; never two open at once", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  const b = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  assert.equal(b.status, 200);
  assert.deepEqual(S.cancels, [D.pays[0].payment_intent_id]);
  assert.equal(D.pays[0].status, "canceled"); assert.equal(D.pays[1].status, "created");
  assert.notEqual(a.j.paymentId, b.j.paymentId);
});
test("P3 a trip already paid by card cannot be charged again", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  tap(D.pays[0].payment_intent_id);
  await call({ action: "result", paymentId: a.j.paymentId, outcome: "succeeded" });
  const b = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  assert.equal(b.status, 409); assert.match(b.j.error, /already paid/);
  assert.equal(S.creates.length, 1);
});
test("P4 a press for a trip whose first payment WAS paid (app closed before it heard): found, not charged twice", async () => {
  await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  tap(D.pays[0].payment_intent_id);   // paid on the reader; the app never told the server
  const b = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  assert.equal(b.status, 409); assert.equal(S.creates.length, 1);
  assert.equal(D.pays[0].status, "succeeded"); assert.equal(S.transfers.length, 1, "and his share went out");
});
test("P5 typed amounts: within the limit, no trip needed; meter needs a cab", async () => {
  assert.equal((await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 60000 })).status, 400);
  D.trips.length = 0;   // no meter trip at all: typed still works
  const ok = await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  assert.equal(ok.status, 200); assert.equal(ok.j.amountCents, 2100); assert.equal(D.pays[0].meter_trip_id, null);
  const nm = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 2000 });
  assert.equal(nm.status, 409); assert.match(nm.j.error, /cannot see this cab's meter trip/);
  D.terminals[0].taxiId = null;
  const m = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 2000 });
  assert.equal(m.status, 400); assert.match(m.j.error, /Type the amount/);
});
test("P6 payout account not ready: no card is taken at all", async () => {
  D.accounts.delete(ASLAM);
  const r = await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  assert.equal(r.status, 409); assert.equal(r.j.problem, "payout_not_ready"); assert.equal(S.creates.length, 0);
});

// ---- result, transfer --------------------------------------------------------------------
test("R1 paid: recorded from Stripe (card, charge), his share sent once to his own account, tied to the charge", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  const ch = tap(D.pays[0].payment_intent_id, { brand: "mastercard", last4: "0005" });
  const r = await call({ action: "result", paymentId: a.j.paymentId, outcome: "succeeded" });
  assert.equal(r.j.status, "succeeded"); assert.deepEqual(r.j.card, { brand: "mastercard", last4: "0005" });
  assert.equal(S.transfers.length, 1);
  const t = S.transfers[0];
  assert.deepEqual([t.p.amount, t.p.destination, t.p.source_transaction, t.p.currency], [10150, "acct_1Aslam", ch.id, "aud"]);
  assert.equal(t.o.idempotencyKey, `transfer_${D.pays[0].payment_intent_id}`);
  assert.equal(D.pays[0].transfer_status, "sent");
  await call({ action: "result", paymentId: a.j.paymentId, outcome: "succeeded" });
  await hook("payment_intent.succeeded", { object: "payment_intent", id: D.pays[0].payment_intent_id });
  assert.equal(S.transfers.length, 1, "never a second transfer");
});
test("R2 the app's word is not taken: 'succeeded' with nothing paid stays open; 'cancelled' after a real payment is recorded as paid", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  const r = await call({ action: "result", paymentId: a.j.paymentId, outcome: "succeeded" });
  assert.equal(r.j.status, "created"); assert.equal(S.transfers.length, 0);
  tap(D.pays[0].payment_intent_id);
  const c = await call({ action: "result", paymentId: a.j.paymentId, outcome: "canceled" });
  assert.equal(c.j.status, "succeeded"); assert.equal(S.transfers.length, 1);
});
test("R3 cancelled on the terminal: cancelled on Stripe too, nothing sent", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  const c = await call({ action: "result", paymentId: a.j.paymentId, outcome: "canceled", message: "Passenger cancelled" });
  assert.equal(c.j.status, "canceled"); assert.deepEqual(S.cancels, [D.pays[0].payment_intent_id]);
  assert.equal(S.transfers.length, 0);
});
test("R4 another terminal cannot read or touch a payment", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  D.terminals.push({ ...D.terminals[0], id: "term-2", hash: hash(OTHER) });
  const r = await post({ key: OTHER, action: "result", paymentId: a.j.paymentId, outcome: "canceled" });
  assert.equal(r.status, 404); assert.equal(D.pays[0].status, "created");
});
test("R5 the driver is the one the terminal is allocated to when the payment STARTS", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  D.drivers.set("d-2", { id: "d-2", full_name: "Other Driver", status: "active" }); D.accounts.set("d-2", { account_id: "acct_1Other", status: "ready" });
  D.terminals[0].driverId = "d-2";   // the office moves the terminal while the passenger taps
  tap(D.pays[0].payment_intent_id);
  await call({ action: "result", paymentId: a.j.paymentId, outcome: "succeeded" });
  assert.equal(S.transfers[0].p.destination, "acct_1Aslam");
});
test("R6 Stripe's transfer fails (account restricted): kept as failed with the reason, sent by the daily sweep later", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  tap(D.pays[0].payment_intent_id);
  let fail = true;   // the first transfer attempt fails
  const mod = await import("@/lib/stripe");
  const client = mod.getStripeClient();
  const save = client.transfers.create;
  client.transfers.create = async (...x) => { if (fail) throw new Error("Your destination account needs to have at least one of the following capabilities enabled: transfers"); return save(...x); };
  await call({ action: "result", paymentId: a.j.paymentId, outcome: "succeeded" });
  assert.equal(D.pays[0].transfer_status, "failed"); assert.match(D.pays[0].transfer_error, /capabilities/);
  fail = false;
  const s = await sweep.GET(new Request("https://x/api/terminal/sweep", { headers: { authorization: "Bearer cron-test-secret" } }));
  assert.deepEqual(await s.json(), { ok: true, sent: 1, failed: 0, settled: 0, cancelled: 0, checked: 1 });
  assert.equal(D.pays[0].transfer_status, "sent"); assert.equal(S.transfers.length, 1);
  client.transfers.create = save;
});

// ---- webhook: refunds, disputes, repeats -------------------------------------------------
async function paidFare() {
  const a = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  const ch = tap(D.pays.at(-1).payment_intent_id);
  await call({ action: "result", paymentId: a.j.paymentId, outcome: "succeeded" });
  return { pay: D.pays.at(-1), ch };
}
test("W1 the webhook alone settles a fare the app never reported, and a repeated event does nothing more", async () => {
  await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  tap(D.pays[0].payment_intent_id);
  const evt = "evt_same0001";
  assert.equal((await hook("payment_intent.succeeded", { object: "payment_intent", id: D.pays[0].payment_intent_id }, evt)).status, 200);
  assert.equal(D.pays[0].status, "succeeded"); assert.equal(S.transfers.length, 1);
  await hook("payment_intent.succeeded", { object: "payment_intent", id: D.pays[0].payment_intent_id }, evt);
  assert.equal(S.transfers.length, 1);
});
test("W2 a half refund takes back half his share; the rest refunded later takes back the rest - never more", async () => {
  const { pay, ch } = await paidFare();
  S.charges.get(ch.id).amount_refunded = 5250;
  await hook("charge.refunded", { object: "charge", id: ch.id });
  assert.equal(S.reversals.length, 1); assert.equal(S.reversals[0].p.amount, 5075);
  assert.equal(D.pays[0].transfer_status, "partly_reversed");
  S.charges.get(ch.id).amount_refunded = 10500;
  await hook("charge.refund.updated", { object: "refund", id: "re_1", charge: ch.id });
  assert.equal(S.reversals.length, 2); assert.equal(S.reversals[1].p.amount, 5075);
  assert.equal(D.pays[0].reversed_cents, 10150); assert.equal(D.pays[0].transfer_status, "reversed");
  await hook("charge.refunded", { object: "charge", id: ch.id });
  assert.equal(S.reversals.length, 2); void pay;
});
test("W3 a dispute takes back his whole share", async () => {
  const { ch } = await paidFare();
  S.charges.get(ch.id).disputed = true;
  await hook("charge.dispute.created", { object: "dispute", id: "dp_1", charge: ch.id });
  assert.equal(S.reversals.length, 1); assert.equal(S.reversals[0].p.amount, 10150);
  assert.equal(D.pays[0].disputed, true);
});
test("W4 refunded before his share went: nothing sent, the office is told", async () => {
  await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  const ch = tap(D.pays[0].payment_intent_id); S.charges.get(ch.id).amount_refunded = 2100;
  await hook("payment_intent.succeeded", { object: "payment_intent", id: D.pays[0].payment_intent_id });
  assert.equal(S.transfers.length, 0); assert.equal(D.pays[0].transfer_status, "failed"); assert.match(D.pays[0].transfer_error, /Office to check/);
});
test("W5 events about other things (not an S710 fare) are left alone", async () => {
  const r = await hook("payment_intent.succeeded", { object: "payment_intent", id: "pi_notours" });
  assert.equal(r.status, 200); assert.equal(D.events.size, 0);
});

// ---- sweep ---------------------------------------------------------------------------------
test("S1 the daily sweep needs its secret", async () => {
  delete process.env.CRON_SECRET;
  assert.equal((await sweep.GET(new Request("https://x/api/terminal/sweep"))).status, 503);
  process.env.CRON_SECRET = "cron-test-secret";
  assert.equal((await sweep.GET(new Request("https://x/api/terminal/sweep", { headers: { authorization: "Bearer wrong" } }))).status, 401);
});
test("S2 the sweep finds a fare paid while the app was closed, and cancels one never finished", async () => {
  await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 3000 });
  tap(D.pays[0].payment_intent_id);
  D.pays[1].created_at = new Date(Date.now() - 31 * 60 * 1000).toISOString();
  const s = await sweep.GET(new Request("https://x/api/terminal/sweep", { headers: { authorization: "Bearer cron-test-secret" } }));
  const j = await s.json();
  assert.equal(j.settled, 1); assert.equal(j.cancelled, 1);
  assert.equal(D.pays[0].transfer_status, "sent"); assert.equal(D.pays[1].status, "canceled");
  assert.deepEqual(S.cancels, [D.pays[1].payment_intent_id]);
});
test("S3 amounts never drift: a PaymentIntent with another amount is flagged, not paid out", async () => {
  await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  S.intents.get(D.pays[0].payment_intent_id).amount = 9999; tap(D.pays[0].payment_intent_id);
  await hook("payment_intent.succeeded", { object: "payment_intent", id: D.pays[0].payment_intent_id });
  assert.equal(S.transfers.length, 0); assert.match(D.pays[0].failure_message, /Office to check/);
});

// ---- after the independent review (31 Oct) -----------------------------------------------
test("X1 a payment still being read is never recorded as cancelled; no second charge for its trip", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  S.intents.get(D.pays[0].payment_intent_id).status = "processing";
  const c = await call({ action: "result", paymentId: a.j.paymentId, outcome: "failed", message: "timed out" });
  assert.equal(c.j.status, "processing"); assert.equal(D.pays[0].status, "processing");
  const b = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  assert.equal(b.status, 409); assert.equal(S.creates.length, 1);
  tap(D.pays[0].payment_intent_id);   // it went through after all
  await hook("payment_intent.succeeded", { object: "payment_intent", id: D.pays[0].payment_intent_id });
  assert.equal(D.pays[0].status, "succeeded"); assert.equal(S.transfers.length, 1);
});
test("X2 the meter trip must be the terminal's driver's", async () => {
  D.trips[0].driver_id = "d-night";
  const r = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  assert.equal(r.status, 409); assert.match(r.j.error, /another driver's/); assert.equal(S.creates.length, 0);
});
test("X3 a trip ended at the office is charged for exactly its total", async () => {
  Object.assign(D.trips[0], { status: "ended", total_cents: 4321 });
  assert.equal((await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 9999 })).status, 409);
  const ok = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 4321 });
  assert.equal(ok.status, 200); assert.equal(ok.j.amountCents, 4537);
});
test("X4 the app's result and the webhook together: one transfer, recorded as sent", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  tap(D.pays[0].payment_intent_id);
  await Promise.all([
    call({ action: "result", paymentId: a.j.paymentId, outcome: "succeeded" }),
    hook("payment_intent.succeeded", { object: "payment_intent", id: D.pays[0].payment_intent_id }),
    hook("payment_intent.succeeded", { object: "payment_intent", id: D.pays[0].payment_intent_id }),
  ]);
  assert.equal(S.transfers.length, 1); assert.equal(D.pays[0].transfer_status, "sent"); assert.ok(D.pays[0].transfer_id);
});
test("X5 a transfer made but not recorded (the answer was lost) is found and kept, never made again", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  tap(D.pays[0].payment_intent_id);
  D.failNextUpdate = false;
  const mod = await import("@/lib/stripe"); const client = mod.getStripeClient(); const save = client.transfers.create;
  client.transfers.create = async (...x) => { const tr = await save(...x); throw Object.assign(new Error("timeout"), { made: tr }); };
  await call({ action: "result", paymentId: a.j.paymentId, outcome: "succeeded" });
  client.transfers.create = save;
  assert.equal(S.transfers.length, 1); assert.equal(D.pays[0].transfer_status, "failed");
  S.transfers[0].o.idempotencyKey = "expired-after-24h";   // Stripe has forgotten the key
  await sweep.GET(new Request("https://x/api/terminal/sweep", { headers: { authorization: "Bearer cron-test-secret" } }));
  assert.equal(S.transfers.length, 1, "the existing transfer is adopted"); assert.equal(D.pays[0].transfer_status, "sent");
  assert.equal(D.pays[0].transfer_id, S.transfers[0].tr.id);
});
test("X6 take-backs count from Stripe's own reversed figure (a reversal the record missed is not repeated)", async () => {
  const { ch } = await paidFare();
  S.reversals.push({ trId: D.pays[0].transfer_id, p: { amount: 5075 }, o: { idempotencyKey: "earlier" } });   // made, never recorded
  S.charges.get(ch.id).amount_refunded = 10500;
  await hook("charge.refunded", { object: "charge", id: ch.id });
  const sum = S.reversals.reduce((a, r) => a + r.p.amount, 0);
  assert.equal(sum, 10150); assert.equal(D.pays[0].reversed_cents, 10150); assert.equal(D.pays[0].transfer_status, "reversed");
});
test("X7 a database error in the webhook answers 500, so Stripe sends the event again", async () => {
  await call({ action: "pay", requestId: rid(), source: "typed", fareCents: 2000 });
  D.dbDown = true;
  const r = await hook("payment_intent.succeeded", { object: "payment_intent", id: D.pays[0].payment_intent_id });
  assert.equal(r.status, 500);
});
test("X8 a dispute won: the office is told the share can go back", async () => {
  const { ch } = await paidFare();
  S.charges.get(ch.id).disputed = true;
  await hook("charge.dispute.created", { object: "dispute", id: "dp_9", charge: ch.id });
  S.disputeStatus = "won";
  await hook("charge.dispute.closed", { object: "dispute", id: "dp_9", charge: ch.id });
  assert.match(D.pays[0].transfer_error, /Dispute dp_9 won/);
});
test("X9 no token for a reader without a location (never an account-wide token)", async () => {
  const mod = await import("@/lib/stripe"); const client = mod.getStripeClient(); const save = client.terminal.readers.retrieve;
  client.terminal.readers.retrieve = async (r) => ({ id: r, location: null });
  D.terminals[0].readerId = "tmr_NoLocation1";
  const r = await call({ action: "token" });
  client.terminal.readers.retrieve = save;
  assert.equal(r.status, 409); assert.equal(S.tokens.length, 0);
});
test("X10 the daily check finds a refund the webhook missed", async () => {
  const { ch } = await paidFare();
  S.charges.get(ch.id).amount_refunded = 10500;   // refunded in the Stripe dashboard; the webhook never came
  const s = await sweep.GET(new Request("https://x/api/terminal/sweep", { headers: { authorization: "Bearer cron-test-secret" } }));
  assert.equal((await s.json()).checked, 1);
  assert.equal(D.pays[0].transfer_status, "reversed"); assert.ok(D.pays[0].refund_checked_at);
});
test("X11 unknown actions and unknown terminals stop before anything else", async () => {
  assert.equal((await call({ action: "x".repeat(500) })).status, 400);
  assert.equal((await post({ key: OTHER, action: "pay", requestId: rid(), source: "typed", fareCents: 2000 })).status, 403);
  assert.equal(S.creates.length, 0);
});
test("X12 the card is tapped just as the cancel is sent: Stripe refuses the cancel, the payment is not recorded as cancelled", async () => {
  const a = await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 });
  const mod = await import("@/lib/stripe"); const client = mod.getStripeClient(); const save = client.paymentIntents.cancel;
  client.paymentIntents.cancel = async (pid) => { S.intents.get(pid).status = "processing"; throw new Error("This PaymentIntent is processing and cannot be canceled"); };
  const c = await call({ action: "result", paymentId: a.j.paymentId, outcome: "canceled" });
  client.paymentIntents.cancel = save;
  assert.equal(c.j.status, "processing"); assert.notEqual(D.pays[0].status, "canceled");
  assert.equal((await call({ action: "pay", requestId: rid(), source: "meter", fareCents: 10000 })).status, 409, "no second charge for the trip");
});

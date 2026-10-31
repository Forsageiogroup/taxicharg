// tc-0016 tests: an S710 driver's card pages and the TaxiCharg app's API - the rows and totals he
// sees, the download, his balance and Cash out (manual payouts, at most what is available, once per
// press), and who may call (website login or the app's Supabase sign-in; only his own money).
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ---- fake Stripe --------------------------------------------------------------------------------
const S = { settings: [], payouts: [], creates: [], ext: [{ available_payout_methods: ["standard", "instant"] }], failNext: null, balance: { available: [{ currency: "aud", amount: 10000 }], pending: [{ currency: "aud", amount: 2100 }] } };
class FakeStripe {
  balanceSettings = { update: async (p, o) => { S.settings.push({ p, o }); return {}; } };
  balance = { retrieve: async (_p, o) => { S.lastAccount = o.stripeAccount; return S.balance; } };
  payouts = {
    list: async (_p, o) => ({ data: S.payouts.filter((x) => x.acct === o.stripeAccount) }),
    create: async (p, o) => {
      if (S.failNext) { const e = Object.assign(new Error("stripe says no"), { code: S.failNext }); S.failNext = null; throw e; }
      const dup = S.creates.find((c) => c.o.idempotencyKey === o.idempotencyKey);
      if (dup) return dup.po;
      const po = { id: "po_" + (S.creates.length + 1), amount: p.amount, method: p.method || "standard", application_fee_amount: p.method === "instant" ? Math.max(50, Math.round(p.amount / 100)) : null,
        status: p.method === "instant" ? "in_transit" : "pending", created: Math.floor(Date.now() / 1000), arrival_date: 1793664000, acct: o.stripeAccount };
      S.creates.push({ p, o, po }); S.payouts.unshift(po); return po;
    },
  };
  accounts = { listExternalAccounts: async (acct) => { S.extFor = acct; return { data: S.ext }; } };
}
mock.module("stripe", { defaultExport: FakeStripe });

// ---- fake logins and data -----------------------------------------------------------------------
const ASLAM = { id: "d-9001", name: "Aslam Ahmed Sheikh", status: "active", view: { clover: false, stripe: true, none: false } };
let cookieDriver = null;
const authUsers = new Map([["tok_aslam_aaaaaaaaaaaaaaaaaaaaaa", "u-aslam"]]);
const driverRows = [{ id: "d-9001", auth_user_id: "u-aslam" }];
mock.module("@/lib/driverSession", { namedExports: { requireDriverSession: async () => (cookieDriver ? { driver: cookieDriver } : null) } });
mock.module("@/lib/supabase", { namedExports: {
  authClient: () => ({ auth: { getUser: async (t) => (authUsers.has(t) ? { data: { user: { id: authUsers.get(t) } }, error: null } : { data: null, error: { message: "bad jwt" } }) } }),
  db: () => ({ from: () => ({ select: () => ({ eq: (_c, v) => ({ limit: async () => ({ data: driverRows.filter((r) => r.auth_user_id === v), error: null }) }) }) }) }),
  BRAND: "taxicharge",
} });
const drivers = new Map([["d-9001", ASLAM], ["d-other", { id: "d-other", name: "Other", status: "active", view: { clover: true, stripe: false } }]]);
mock.module("@/lib/data/drivers", { namedExports: { findDriverById: async (id) => drivers.get(id) || null } });
const accounts = new Map();
mock.module("@/lib/data/stripeAccounts", { namedExports: { getPayoutAccount: async (d) => accounts.get(d) || null } });
let rows = [];
mock.module("@/lib/data/terminalPay", { namedExports: { cardPaymentsForDriver: async (d) => rows.filter((r) => r.driver_id === d) } });
let allow = true;
const { NextResponse } = await import("next/server");
mock.module("@/lib/protect", { namedExports: { rateHit: async () => allow, tooMany: (m) => NextResponse.json({ error: m }, { status: 429 }) } });

const R = await import("@/lib/money/cardReport");
const I = await import("@/lib/money/instantCashout");
const getRoute = await import("@/app/api/driver/card/route.js");
const cashRoute = await import("@/app/api/driver/card/cashout/route.js");

const pay = (o) => ({ id: "11111111-aaaa-bbbb-cccc-000000000001", driver_id: "d-9001", created_at: "2026-10-31T12:13:00Z", succeeded_at: "2026-10-31T12:14:00Z", source: "typed",
  fare_cents: 10000, surcharge_cents: 500, amount_cents: 10500, commission_cents: 150, driver_share_cents: 10150, status: "succeeded",
  card_brand: "visa", card_last4: "9969", refunded_cents: 0, disputed: false, transfer_id: "tr_1", transfer_status: "sent", reversed_cents: 0, ...o });
const get = (headers = {}) => getRoute.GET(new Request("https://x/api/driver/card", { headers }));
const cash = (body, headers = {}) => cashRoute.POST(new Request("https://x/api/driver/card/cashout", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }));
const BEARER = { authorization: "Bearer tok_aslam_aaaaaaaaaaaaaaaaaaaaaa" };

beforeEach(() => {
  Object.assign(S, { settings: [], payouts: [], creates: [], ext: [{ available_payout_methods: ["standard", "instant"] }], failNext: null, balance: { available: [{ currency: "aud", amount: 10000 }], pending: [{ currency: "aud", amount: 2100 }] } });
  cookieDriver = null; allow = true;
  accounts.clear(); accounts.set("d-9001", { account_id: "acct_1Aslam", status: "ready", livemode: false });
  rows = [pay({})];
  process.env.STRIPE_SECRET_KEY = "sk_test_x"; process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x"; delete process.env.TC_STRIPE_LIVE;
  for (const k of ["TC_INSTANT_CASHOUT", "TC_INSTANT_FEE_PCT", "TC_INSTANT_FEE_MIN_CENTS", "TC_INSTANT_DAY_MAX_CENTS"]) delete process.env[k];
});

// ---- what he sees ---------------------------------------------------------------------------------
test("C1 one card fare: fare, commission, yours, card, in his balance - and never the service charge or card total (tc-0017)", () => {
  const [r] = R.cardRows([pay({})]);
  assert.deepEqual([r.ref, r.fare, r.commission, r.yours, r.card], ["11111111", 100, 1.5, 101.5, "VISA 9969"]);
  assert.equal("serviceCharge" in r, false); assert.equal("cardTotal" in r, false);
  assert.equal(JSON.stringify(r).includes("105"), false, "the card total is nowhere in his row");
  assert.equal(r.status.label, "Paid"); assert.equal(r.paidToYou.label, "In your balance");
});
test("C2 refunds and disputes: what was taken back is not his; not-paid fares are not listed", () => {
  const rs = R.cardRows([pay({ id: "a", refunded_cents: 5250, transfer_status: "partly_reversed", reversed_cents: 5075 }), pay({ id: "b", disputed: true, transfer_status: "reversed", reversed_cents: 10150 }), pay({ id: "c", status: "canceled" })]);
  assert.equal(rs.length, 2);
  const a = rs.find((x) => x.id === "a"), b = rs.find((x) => x.id === "b");
  assert.equal(a.status.label, "Partly refunded"); assert.equal(a.yours, 50.75); assert.equal(a.paidToYou.label, "Partly taken back");
  assert.equal(b.status.label, "Disputed"); assert.equal(b.yours, 0);
  const t = R.cardTotals(rs);
  assert.deepEqual([t.transactions, t.fares, t.takenBack, t.yours], [2, 200, 152.25, 50.75]);
});
test("C3 the download: totals, one line per fare, Sydney time, and no Excel formulas", () => {
  const rs = R.cardRows([pay({})]);
  const csv = R.cardCsv({ name: "=HYPERLINK(evil)", from: "2026-10-01", to: "2026-10-31", totals: R.cardTotals(rs), rows: rs });
  assert.match(csv, /'=HYPERLINK\(evil\)/);
  assert.match(csv, /31\/10\/2026, 23:14/);   // 12:14 UTC = 23:14 Sydney (AEDT) - as on the S710 receipt
  assert.match(csv, /100\.00,1\.50,101\.50,Paid,In your balance/);
  assert.equal(/service charge|card total|105\.00/i.test(csv), false, "no service charge in his download (tc-0017)");
});
test("C4 Sydney days: a fare at 23:14 Sydney on 31 Oct is in 31 Oct; one at 00:30 Sydney 1 Nov (13:30 UTC) is in 1 Nov", () => {
  const rs = R.cardRows([pay({}), pay({ id: "late", succeeded_at: "2026-10-31T13:30:00Z" })]);
  assert.deepEqual(R.inDays(rs, "2026-10-31", "2026-10-31").map((r) => r.id), ["11111111-aaaa-bbbb-cccc-000000000001"]);
  assert.deepEqual(R.inDays(rs, "2026-11-01", "2026-11-01").map((r) => r.id), ["late"]);
});
test("C5 balance and cash outs in his words", () => {
  assert.deepEqual(R.balanceView(S.balance), { available: 100, onTheWay: 21 });
  const p = R.payoutView({ id: "po_1", amount: 5000, status: "in_transit", created: 1793500000, arrival_date: 1793664000 });
  assert.equal(p.label, "On its way to your bank"); assert.equal(p.amount, 50); assert.equal(p.arrivesOn, "2026-11-03");
});

// ---- the API: who may call ------------------------------------------------------------------------
test("A1 the app's sign-in (Bearer) gets HIS card money, and his payouts are set to manual", async () => {
  const r = await get(BEARER);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.cardSide, true); assert.equal(j.rows.length, 1); assert.deepEqual(j.balance, { available: 100, onTheWay: 21 });
  assert.equal(j.totals.yours, 101.5);
  assert.equal(/serviceCharge|cardTotal|surcharge|105/i.test(JSON.stringify(j)), false, "the app is never sent the service charge (tc-0017)");
  assert.equal(S.lastAccount, "acct_1Aslam");
  assert.deepEqual(S.settings[0], { p: { payments: { payouts: { schedule: { interval: "manual" } } } }, o: { stripeAccount: "acct_1Aslam" } });
  assert.equal(JSON.stringify(j).includes("acct_"), false, "his Stripe account id is never sent");
});
test("A2 no login, a bad token, or a sign-in on two driver records: refused", async () => {
  assert.equal((await get()).status, 401);
  assert.equal((await get({ authorization: "Bearer tok_wrong_aaaaaaaaaaaaaaaaaaaa" })).status, 401);
  driverRows.push({ id: "d-other", auth_user_id: "u-aslam" });
  assert.equal((await get(BEARER)).status, 401);
  driverRows.pop();
});
test("A3 the website's login works the same; a suspended driver is refused", async () => {
  cookieDriver = ASLAM;
  assert.equal((await get()).status, 200);
  cookieDriver = { ...ASLAM, status: "suspended" };
  assert.equal((await get()).status, 403);
});

// ---- Cash out -------------------------------------------------------------------------------------
test("P1 Cash out: everything available by default, to his own account, once per press", async () => {
  const r = await cash({ requestId: "req_cash_000000000001" }, BEARER);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.payout.amount, 100); assert.equal(j.payout.label, "Requested");
  assert.equal(S.creates[0].p.amount, 10000); assert.equal(S.creates[0].p.currency, "aud");
  assert.equal(S.creates[0].o.stripeAccount, "acct_1Aslam"); assert.equal(S.creates[0].o.idempotencyKey, "tccash_req_cash_000000000001");
  await cash({ requestId: "req_cash_000000000001" }, BEARER);
  assert.equal(S.creates.length, 1, "the same press sent twice is one cash out");
});
test("P2 never more than is available; at least $1; a whole number of cents", async () => {
  let r = await cash({ requestId: "req_cash_000000000002", amountCents: 10001 }, BEARER);
  assert.equal(r.status, 400); assert.match((await r.json()).error, /Only \$100\.00 is available/);
  assert.equal((await cash({ requestId: "req_cash_000000000003", amountCents: 99 }, BEARER)).status, 400);
  assert.equal((await cash({ requestId: "req_cash_000000000004", amountCents: 12.5 }, BEARER)).status, 400);
  S.balance = { available: [], pending: [{ currency: "aud", amount: 2100 }] };
  r = await cash({ requestId: "req_cash_000000000005" }, BEARER);
  assert.match((await r.json()).error, /Nothing is available/);
  assert.equal(S.creates.length, 0);
});
test("P3 a part cash out; no payout account or not ready: refused", async () => {
  assert.equal((await cash({ requestId: "req_cash_000000000006", amountCents: 2500 }, BEARER)).status, 200);
  assert.equal(S.creates[0].p.amount, 2500);
  accounts.set("d-9001", { account_id: "acct_1Aslam", status: "onboarding" });
  assert.equal((await cash({ requestId: "req_cash_000000000007" }, BEARER)).status, 409);
  accounts.delete("d-9001");
  assert.equal((await cash({ requestId: "req_cash_000000000008" }, BEARER)).status, 409);
  assert.equal(S.creates.length, 1);
});
test("P4 cash out needs a login, a request id, and is limited per hour", async () => {
  assert.equal((await cash({ requestId: "req_cash_000000000009" })).status, 401);
  assert.equal((await cash({}, BEARER)).status, 400);
  allow = false;
  assert.equal((await cash({ requestId: "req_cash_000000000010" }, BEARER)).status, 429);
});
test("P5 a live key on this site: no cash out", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_live_x"; process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_x";
  assert.equal((await cash({ requestId: "req_cash_000000000011" }, BEARER)).status, 503);
  assert.equal(S.creates.length, 0);
});

// ---- tc-0018: Instant cash out (the owner, 31 Oct: instant, the driver pays 1% min $0.50; Free stays) ----
// Stripe's balance after the fare: $120 can go instantly; with the 1% fee set in Stripe, $118.81 + $1.19 fee.
const INSTANT_BAL = { available: [], pending: [{ currency: "aud", amount: 12000 }], instant_available: [{ currency: "aud", amount: 12000, net_available: [{ amount: 11881, destination: "ba_1" }] }] };

test("I1 the fee: 1% of what he gets, at least $0.50", () => {
  assert.equal(I.instantFeeCents(10000), 100);
  assert.equal(I.instantFeeCents(11881), 119);
  assert.equal(I.instantFeeCents(2000), 50);
  assert.equal(I.instantFeeCents(0), 0);
  assert.equal(I.instantFeeCents(10000, I.instantSettings({ TC_INSTANT_FEE_PCT: "9" })), 500, "never more than 5%");
});
test("I2 what can go instantly: Stripe's net amount, only when Stripe's fee is OUR fee; the daily limit", () => {
  assert.deepEqual(I.instantView(INSTANT_BAL), { pct: 1, minFeeCents: 50, dayLeftCents: 100000, on: true, maxCents: 11881, feeOnMaxCents: 119, reason: null });
  const noFee = { instant_available: [{ currency: "aud", amount: 12000 }] };
  assert.equal(I.instantView(noFee).reason, "not_set_up", "fee not set in Stripe: TaxiCharg would pay it - off");
  const wrongFee = { instant_available: [{ currency: "aud", amount: 12000, net_available: [{ amount: 11600 }] }] };
  assert.equal(I.instantView(wrongFee).reason, "not_set_up", "a different fee in Stripe: off");
  assert.equal(I.instantView({ instant_available: [] }).reason, "nothing");
  assert.equal(I.instantView(INSTANT_BAL, { todayCents: 95000 }).maxCents, 5000, "at most what is left of today's $1,000");
  assert.equal(I.instantView(INSTANT_BAL, { todayCents: 99950 }).reason, "day_limit");
  assert.equal(I.instantView(INSTANT_BAL, { settings: I.instantSettings({ TC_INSTANT_CASHOUT: "off" }) }).reason, "off");
});
test("I3 Sydney days for the daily limit: 00:30 Sydney 1 Nov counts from Sydney midnight", () => {
  assert.equal(I.sydneyDayStart(Date.parse("2026-10-31T13:30:00Z")), Date.parse("2026-10-31T13:00:00Z") / 1000);
  const start = Date.parse("2026-10-31T13:00:00Z") / 1000;
  const p = [{ method: "instant", amount: 5000, created: start + 10, status: "paid" }, { method: "instant", amount: 7000, created: start - 10, status: "paid" },
    { method: "instant", amount: 3000, created: start + 20, status: "failed" }, { method: "standard", amount: 9000, created: start + 30, status: "paid" }];
  assert.equal(I.instantTodayCents(p, Date.parse("2026-10-31T13:30:00Z")), 5000);
});
test("I4 the app and the page get Instant: up to $118.81, fee $1.19, 1% min $0.50 - never an account id", async () => {
  S.balance = INSTANT_BAL;
  const j = await (await get(BEARER)).json();
  assert.deepEqual(j.instant, { on: true, max: 118.81, feeOnMax: 1.19, feePct: 1, feeMin: 0.5, reason: null, note: null });
  assert.equal(S.extFor, "acct_1Aslam");
  assert.equal(JSON.stringify(j).includes("acct_"), false);
  S.ext = [{ available_payout_methods: ["standard"] }];
  const k = await (await get(BEARER)).json();
  assert.equal(k.instant.on, false); assert.match(k.instant.note, /cannot take instant cash outs/);
});
test("I5 Instant cash out: the most by default, method instant, its own key, once per press; the fee shown is Stripe's", async () => {
  S.balance = INSTANT_BAL;
  const r = await cash({ requestId: "req_inst_000000000001", method: "instant" }, BEARER);
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(S.creates[0].p.method, "instant"); assert.equal(S.creates[0].p.amount, 11881);
  assert.equal(S.creates[0].o.idempotencyKey, "tcinst_req_inst_000000000001"); assert.equal(S.creates[0].o.stripeAccount, "acct_1Aslam");
  assert.equal(j.payout.instant, true); assert.equal(j.payout.amount, 118.81); assert.equal(j.payout.fee, 1.19);
  assert.equal(j.payout.label, "On its way - about 30 minutes");
  await cash({ requestId: "req_inst_000000000001", method: "instant" }, BEARER);
  assert.equal(S.creates.length, 1, "the same press twice is one cash out");
});
test("I6 Instant: never more than allowed; refused when the fee is not set in Stripe; Stripe's refusals in his words", async () => {
  S.balance = INSTANT_BAL;
  let r = await cash({ requestId: "req_inst_000000000002", method: "instant", amountCents: 12000 }, BEARER);
  assert.equal(r.status, 400); assert.match((await r.json()).error, /Up to \$118\.81/);
  S.failNext = "instant_payouts_unsupported";
  r = await cash({ requestId: "req_inst_000000000003", method: "instant", amountCents: 5000 }, BEARER);
  assert.equal(r.status, 409); assert.match((await r.json()).error, /cannot take instant/);
  S.failNext = "balance_insufficient";
  r = await cash({ requestId: "req_inst_000000000004", method: "instant", amountCents: 5000 }, BEARER);
  assert.equal(r.status, 400); assert.match((await r.json()).error, /Not enough in your balance/);
  S.balance = { available: [], pending: [], instant_available: [{ currency: "aud", amount: 12000 }] };
  r = await cash({ requestId: "req_inst_000000000005", method: "instant" }, BEARER);
  assert.equal(r.status, 409); assert.match((await r.json()).error, /not ready yet/);
  assert.equal(S.creates.length, 0);
});
test("I7 Instant: today's $1,000 limit per driver (Sydney day); switched off by TC_INSTANT_CASHOUT=off", async () => {
  S.balance = INSTANT_BAL;
  S.payouts = [{ id: "po_x", acct: "acct_1Aslam", method: "instant", amount: 99950, status: "paid", created: Math.floor(Date.now() / 1000) }];
  let r = await cash({ requestId: "req_inst_000000000006", method: "instant" }, BEARER);
  assert.equal(r.status, 400); assert.match((await r.json()).error, /today's instant cash out limit/);
  S.payouts = [];
  process.env.TC_INSTANT_CASHOUT = "off";
  r = await cash({ requestId: "req_inst_000000000007", method: "instant" }, BEARER);
  assert.equal(r.status, 409);
  assert.equal(S.creates.length, 0);
});
test("I8 Free stays as it was (no method = free, its own key, no instant); an unknown method is refused", async () => {
  assert.equal((await cash({ requestId: "req_inst_000000000008", method: "standard" }, BEARER)).status, 200);
  assert.equal(S.creates[0].p.method, undefined); assert.equal(S.creates[0].o.idempotencyKey, "tccash_req_inst_000000000008");
  assert.equal((await cash({ requestId: "req_inst_000000000009", method: "fast" }, BEARER)).status, 400);
  assert.equal(S.creates.length, 1);
});

// tc-0016 tests: an S710 driver's card pages and the TaxiCharg app's API - the rows and totals he
// sees, the download, his balance and Cash out (manual payouts, at most what is available, once per
// press), and who may call (website login or the app's Supabase sign-in; only his own money).
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ---- fake Stripe --------------------------------------------------------------------------------
const S = { settings: [], payouts: [], creates: [], balance: { available: [{ currency: "aud", amount: 10000 }], pending: [{ currency: "aud", amount: 2100 }] } };
class FakeStripe {
  balanceSettings = { update: async (p, o) => { S.settings.push({ p, o }); return {}; } };
  balance = { retrieve: async (_p, o) => { S.lastAccount = o.stripeAccount; return S.balance; } };
  payouts = {
    list: async (_p, o) => ({ data: S.payouts.filter((x) => x.acct === o.stripeAccount) }),
    create: async (p, o) => {
      const dup = S.creates.find((c) => c.o.idempotencyKey === o.idempotencyKey);
      if (dup) return dup.po;
      const po = { id: "po_" + (S.creates.length + 1), amount: p.amount, status: "pending", created: 1793500000, arrival_date: 1793664000, acct: o.stripeAccount };
      S.creates.push({ p, o, po }); S.payouts.unshift(po); return po;
    },
  };
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
const getRoute = await import("@/app/api/driver/card/route.js");
const cashRoute = await import("@/app/api/driver/card/cashout/route.js");

const pay = (o) => ({ id: "11111111-aaaa-bbbb-cccc-000000000001", driver_id: "d-9001", created_at: "2026-10-31T12:13:00Z", succeeded_at: "2026-10-31T12:14:00Z", source: "typed",
  fare_cents: 10000, surcharge_cents: 500, amount_cents: 10500, commission_cents: 150, driver_share_cents: 10150, status: "succeeded",
  card_brand: "visa", card_last4: "9969", refunded_cents: 0, disputed: false, transfer_id: "tr_1", transfer_status: "sent", reversed_cents: 0, ...o });
const get = (headers = {}) => getRoute.GET(new Request("https://x/api/driver/card", { headers }));
const cash = (body, headers = {}) => cashRoute.POST(new Request("https://x/api/driver/card/cashout", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }));
const BEARER = { authorization: "Bearer tok_aslam_aaaaaaaaaaaaaaaaaaaaaa" };

beforeEach(() => {
  Object.assign(S, { settings: [], payouts: [], creates: [], balance: { available: [{ currency: "aud", amount: 10000 }], pending: [{ currency: "aud", amount: 2100 }] } });
  cookieDriver = null; allow = true;
  accounts.clear(); accounts.set("d-9001", { account_id: "acct_1Aslam", status: "ready", livemode: false });
  rows = [pay({})];
  process.env.STRIPE_SECRET_KEY = "sk_test_x"; process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_x"; delete process.env.TC_STRIPE_LIVE;
});

// ---- what he sees ---------------------------------------------------------------------------------
test("C1 one card fare: fare, service charge, card total, commission, yours, card, in his balance", () => {
  const [r] = R.cardRows([pay({})]);
  assert.deepEqual([r.ref, r.fare, r.serviceCharge, r.cardTotal, r.commission, r.yours, r.card], ["11111111", 100, 5, 105, 1.5, 101.5, "VISA 9969"]);
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
  assert.match(csv, /100\.00,5\.00,105\.00,1\.50,101\.50,Paid,In your balance/);
  assert.match(csv, /Service charges paid by passengers,5\.00/);
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

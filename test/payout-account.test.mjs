// tc-0012 tests: the driver payout account (Stripe Accounts v2), with Stripe, the login,
// the rate limit and the database replaced by fakes. Run:
//   node --import ./test/register.mjs --experimental-test-module-mocks --test test/
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ---- fakes -------------------------------------------------------------------------------
const calls = { create: [], retrieve: [], sessions: [] };
let nextAccount;     // what Stripe "returns" for create / retrieve
let createFails = false;
class FakeStripe {
  constructor(key) { this.key = key; }
  v2 = { core: { accounts: {
    create: async (params, opts) => { calls.create.push({ params, opts }); if (createFails) throw Object.assign(new Error("boom"), { type: "StripeAPIError" }); return nextAccount; },
    retrieve: async (id, params) => { calls.retrieve.push({ id, params }); return { ...nextAccount, id }; },
  } } };
  accountSessions = { create: async (p) => { calls.sessions.push(p); return { client_secret: "accs_secret_x" }; } };
  webhooks = { constructEvent: (raw) => JSON.parse(raw) };
}
mock.module("stripe", { defaultExport: FakeStripe });

let session = null;
mock.module("@/lib/driverSession", { namedExports: { requireDriverSession: async () => session } });
let allow = true;
const { NextResponse } = await import("next/server");
mock.module("@/lib/protect", { namedExports: {
  rateHit: async () => allow,
  tooMany: (m) => NextResponse.json({ error: m }, { status: 429 }),
  clientIp: (req) => (req.headers.get("x-real-ip") || "unknown"),
} });

const rows = new Map(); // driver_id -> row
mock.module("@/lib/data/stripeAccounts", { namedExports: {
  shape: (r) => r && { accountId: r.account_id, status: r.status, livemode: r.livemode, requirementsDue: r.requirements_due, termsVersion: r.terms_version },
  getPayoutAccount: async (d) => rows.get(d) || null,
  findPayoutAccountByStripeId: async (a) => [...rows.values()].find((r) => r.account_id === a) || null,
  insertPayoutAccount: async (d, { accountId, livemode, acceptance, summary }) => {
    if (rows.has(d)) return rows.get(d);
    const r = { id: "row-" + d, driver_id: d, account_id: accountId, livemode, terms_version: acceptance.version, terms_accepted_at: acceptance.at, terms_ip: acceptance.ip, status: summary.status, requirements_due: summary.requirementsDue };
    rows.set(d, r); return r;
  },
  saveAccountStatus: async (row, s) => { const r = { ...row, status: s.status, requirements_due: s.requirementsDue }; rows.set(row.driver_id, r); return r; },
} });

const lib = await import("@/lib/stripe");
const accountRoute = await import("@/app/api/stripe/account/route.js");
const sessionRoute = await import("@/app/api/stripe/account-session/route.js");
const webhookRoute = await import("@/app/api/stripe/webhook/route.js");

const DRIVER = { id: "d-1", driverId: "9001", name: "Aslam Ahmed Sheikh", email: "driver1@staging.test", status: "active" };
const onboarding = { id: "acct_1Test", livemode: false, configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "pending" } } } }, merchant: { capabilities: { card_payments: { status: "pending" }, stripe_balance: { payouts: { status: "pending" } } } } }, requirements: { entries: [{}, {}, {}] } };
const ready = { id: "acct_1Test", livemode: false, configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: "active" } } } }, merchant: { capabilities: { card_payments: { status: "active" }, stripe_balance: { payouts: { status: "active" } } } } }, requirements: { entries: [] } };

function post(body, ip = "203.0.113.9") {
  return new Request("https://taxicharg-staging.vercel.app/api/stripe/account", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip, "user-agent": "TestBrowser/1" }, body: JSON.stringify(body) });
}
function setKeys(sk = "sk_test_abc", pk = "pk_test_abc") { process.env.STRIPE_SECRET_KEY = sk; process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk; delete process.env.TC_STRIPE_LIVE; }

beforeEach(() => {
  calls.create.length = 0; calls.retrieve.length = 0; calls.sessions.length = 0;
  rows.clear(); session = { driver: { ...DRIVER }, session: { sub: DRIVER.id } }; allow = true; createFails = false; nextAccount = onboarding; setKeys();
});

// ---- pure parts ---------------------------------------------------------------------------
test("P1 keys: missing, live refused, mismatched, sandbox ok", () => {
  setKeys("", ""); assert.equal(lib.stripeKeyProblem(), "not_configured");
  setKeys("sk_live_x", "pk_live_x"); assert.equal(lib.stripeKeyProblem(), "live_key_refused");
  process.env.TC_STRIPE_LIVE = "yes"; assert.equal(lib.stripeKeyProblem(), null);
  setKeys("sk_test_x", "pk_live_x"); assert.equal(lib.stripeKeyProblem(), "keys_do_not_match");
  setKeys("sk_test_x", ""); assert.equal(lib.stripeKeyProblem(), "no_publishable_key");
  setKeys("whsec_x", "pk_test_x"); assert.equal(lib.stripeKeyProblem(), "bad_key");
  setKeys(); assert.equal(lib.stripeKeyProblem(), null);
});

test("P2 the create call: no dashboard, AU individual, platform pays fees and losses, merchant + recipient, terms attested", () => {
  const p = lib.driverAccountParams({ driver: DRIVER, acceptance: { at: "2026-10-31T01:02:03.000Z", ip: "203.0.113.9", userAgent: "UA" } });
  assert.equal(p.dashboard, "none");
  assert.equal(p.identity.country, "au");
  assert.equal(p.identity.entity_type, "individual");
  assert.deepEqual(p.identity.individual, { given_name: "Aslam Ahmed", surname: "Sheikh", email: "driver1@staging.test" });
  assert.deepEqual(p.identity.attestations.terms_of_service.account, { date: "2026-10-31T01:02:03.000Z", ip: "203.0.113.9", user_agent: "UA" });
  assert.deepEqual(p.defaults.responsibilities, { fees_collector: "application", losses_collector: "application" });
  assert.equal(p.defaults.currency, "aud");
  assert.equal(p.configuration.merchant.capabilities.card_payments.requested, true);
  assert.equal(p.configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested, true);
  assert.equal(p.metadata.driver_id, "d-1");
});

test("P3 a one-word name and no email still make a valid call", () => {
  const p = lib.driverAccountParams({ driver: { id: "d-2", name: "Theresa" }, acceptance: { at: "x", ip: "1.2.3.4" } });
  assert.deepEqual(p.identity.individual, { given_name: "Theresa" });
  assert.equal("contact_email" in p, false);
  assert.equal("user_agent" in p.identity.attestations.terms_of_service.account, false);
});

test("P4 READY only when transfers AND payouts are active", () => {
  assert.equal(lib.summariseAccount(onboarding).status, "onboarding");
  assert.equal(lib.summariseAccount(onboarding).requirementsDue, 3);
  assert.equal(lib.summariseAccount(ready).status, "ready");
  const halfway = structuredClone(ready); halfway.configuration.merchant.capabilities.stripe_balance.payouts.status = "pending";
  assert.equal(lib.summariseAccount(halfway).status, "onboarding");
  const held = structuredClone(ready); held.configuration.recipient.capabilities.stripe_balance.stripe_transfers.status = "restricted";
  assert.equal(lib.summariseAccount(held).status, "restricted");
  assert.equal(lib.summariseAccount({ ...ready, closed: true }).status, "closed");
  assert.equal(lib.summariseAccount({}).status, "onboarding");
});

// ---- the routes ---------------------------------------------------------------------------
test("R1 signed out: 401 everywhere, Stripe never called", async () => {
  session = null;
  assert.equal((await accountRoute.GET()).status, 401);
  assert.equal((await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }))).status, 401);
  assert.equal((await sessionRoute.POST()).status, 401);
  assert.equal(calls.create.length + calls.sessions.length, 0);
});

test("R2 not approved (pending / suspended): refused, nothing opened", async () => {
  for (const st of ["pending", "suspended"]) {
    session.driver.status = st;
    const r = await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }));
    assert.equal(r.status, 403);
    const g = await (await accountRoute.GET()).json();
    assert.equal(g.eligible, false);
  }
  assert.equal(calls.create.length, 0);
});

test("R3 terms not accepted, or an old terms version: refused", async () => {
  assert.equal((await accountRoute.POST(post({}))).status, 400);
  assert.equal((await accountRoute.POST(post({ accept: true, termsVersion: "old" }))).status, 400);
  assert.equal((await accountRoute.POST(post({ accept: "yes", termsVersion: lib.PAYOUT_TERMS_VERSION }))).status, 400);
  assert.equal(calls.create.length, 0);
});

test("R4 opens the account once: Stripe called with the terms time, IP and browser, row stored", async () => {
  const r = await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }));
  assert.equal(r.status, 200);
  const body = await r.json();
  assert.equal(body.account.accountId, "acct_1Test");
  assert.equal(body.account.status, "onboarding");
  assert.equal(calls.create.length, 1);
  const { params, opts } = calls.create[0];
  assert.equal(params.identity.attestations.terms_of_service.account.ip, "203.0.113.9");
  assert.equal(params.identity.attestations.terms_of_service.account.user_agent, "TestBrowser/1");
  assert.match(opts.idempotencyKey, /^tc-acct-d-1-tc-payout-terms-/);
  assert.equal(rows.get("d-1").terms_version, lib.PAYOUT_TERMS_VERSION);
});

test("R5 a second press does not open a second account", async () => {
  await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }));
  const again = await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }));
  assert.equal(again.status, 200);
  assert.equal(calls.create.length, 1);
  assert.equal(rows.size, 1);
});

test("R6 no usable IP: refused before Stripe (Stripe needs it for the terms)", async () => {
  const r = await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }, ""));
  assert.equal(r.status, 400);
  assert.equal(calls.create.length, 0);
});

test("R7 Stripe fails: a plain message, nothing stored", async () => {
  createFails = true;
  const r = await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }));
  assert.equal(r.status, 502);
  assert.equal(rows.size, 0);
  assert.doesNotMatch((await r.json()).error, /boom|stripe/i);
});

test("R8 rate limited: 429, nothing opened", async () => {
  allow = false;
  assert.equal((await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }))).status, 429);
  assert.equal(calls.create.length, 0);
});

test("R9 a live key on this site: payout accounts off, nothing opened", async () => {
  setKeys("sk_live_x", "pk_live_x");
  const r = await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }));
  assert.equal(r.status, 503);
  assert.equal((await (await accountRoute.GET()).json()).configured, false);
  assert.equal(calls.create.length, 0);
});

test("R10 GET re-reads Stripe: onboarding becomes READY", async () => {
  await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }));
  nextAccount = ready;
  const g = await (await accountRoute.GET()).json();
  assert.equal(g.account.status, "ready");
  assert.equal(calls.retrieve.at(-1).id, "acct_1Test");
});

test("R11 the form session is for HIS account only, from the database", async () => {
  assert.equal((await sessionRoute.POST()).status, 404); // none yet
  await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }));
  const r = await sessionRoute.POST();
  assert.equal(r.status, 200);
  assert.equal((await r.json()).client_secret, "accs_secret_x");
  const c = calls.sessions[0];
  assert.equal(c.account, "acct_1Test");
  assert.equal(c.components.account_onboarding.features.disable_stripe_user_authentication, true);
  assert.equal(c.components.payouts, undefined); // withdrawals come in a later step
});

test("R12 webhook account.updated: state re-read from Stripe, not from the event", async () => {
  await accountRoute.POST(post({ accept: true, termsVersion: lib.PAYOUT_TERMS_VERSION }));
  nextAccount = ready;
  const ev = { type: "account.updated", account: "acct_1Test", data: { object: { id: "acct_1Test", payouts_enabled: false } } };
  const r = await webhookRoute.POST(new Request("https://x/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t" }, body: JSON.stringify(ev) }));
  assert.equal(r.status, 200);
  assert.equal(rows.get("d-1").status, "ready");
});

test("R13 webhook for an account that is not ours: ignored", async () => {
  const ev = { type: "account.updated", account: "acct_9Other", data: { object: { id: "acct_9Other" } } };
  const r = await webhookRoute.POST(new Request("https://x/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t" }, body: JSON.stringify(ev) }));
  assert.equal(r.status, 200);
  assert.equal(calls.retrieve.length, 0);
});

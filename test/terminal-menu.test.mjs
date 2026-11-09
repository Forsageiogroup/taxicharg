// tc-0019 tests: the driver's menu on his terminal (Clover FareTap and the S710) and takings by QR - with the
// database (362's functions), the code sender and the money modules replaced by fakes. Run: npm test
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const sha = (s) => createHash("sha256").update(String(s)).digest("hex");
const KEY = "a".repeat(64), KEY2 = "b".repeat(64);
const { NextResponse } = await import("next/server");

let allow = true;
mock.module("@/lib/protect", { namedExports: { rateHit: async () => allow, tooMany: (m) => NextResponse.json({ error: m }, { status: 429 }), clientIp: () => "x" } });

// ---- fake 362 ------------------------------------------------------------------------------------------
const D = {};
const endedOther = [];   // tc-0023
function reset() {
  Object.assign(D, {
    state: { ok: true, terminalId: "t1", terminal: "Dev kit", brand: "clover", provider: "clover", plate: "T1234", allocationId: "a1",
      driverId: "d1", firstName: "Ali", needsCode: true, hasPin: false, lockedUntil: null, abn: "", taxiNumber: "" },
    sessions: new Map(), calls: [], pinSet: [], profile: [], reportArgs: null, scanArgs: null, claims: [], closed: [],
    extras: { abn: "51824753556", taxiNumber: "TC123", onHold: false, status: "active" },
    pinResult: null, scan: null, payments: [], reports: [],
  });
}
const P0001 = (m) => Object.assign(new Error(m), { status: 400 });
mock.module("@/lib/data/terminalMenu", { namedExports: {
  signinState: async (kh) => (kh === sha(KEY) ? { ...D.state } : { ok: false, problem: "not_paired" }),
  codePassed: async (kh, d) => { D.calls.push(["codePassed", d]); D.state.needsCode = false; return { ...D.state }; },
  signin: async (kh, pin, th) => {
    D.calls.push(["signin", pin, th]);
    if (D.pinResult) return D.pinResult;
    D.sessions.set(th, D.state.driverId);
    return { ok: true, sessionId: "s1", driverId: D.state.driverId, expiresAt: "2026-11-10T00:00:00Z" };
  },
  sessionDriver: async (kh, th) => (kh === sha(KEY) ? D.sessions.get(th) || null : null),
  signout: async (kh, th) => { D.sessions.delete(th); },
  endOtherSessions: async (d, keep) => { endedOther.push([d, keep]); },
  setProfile: async (d, p, via, by) => {
    D.profile.push({ d, p, via, by });
    if (p.abn === "123") throw P0001("That ABN is not right. Check the 11 digits.");
    return { abn: p.abn || D.extras.abn, taxiNumber: p.taxiNumber === "" ? null : (p.taxiNumber || D.extras.taxiNumber) };
  },
  setPin: async (d, pin, via) => { D.pinSet.push({ d, pin, via }); },
  newShiftReport: async (kh, th, items, codeHash) => { D.reportArgs = { kh, th, items, codeHash }; return { number: "SR-000007", from: "f", to: "t", payments: 2, voided: 1, cardTotal: 31.5 }; },
  scanOpen: async (a) => { D.scanArgs = a; return D.scan; },
  scanClaim: async (s, ref) => { D.claims.push(ref); return { ref, state: "credited_now", amount: 10.15 }; },
  scanClose: async (s) => { D.closed.push(s); return {}; },
  scanFor: async (id, d) => (id === "11111111-1111-1111-1111-111111111111" && d === "d1" ? { id, outcome: "open", items: [{ ref: "MMMMMMMMMMMM1", state: "not_seen" }, { ref: "AAAAAAAAAAAA1", state: "already_in", amount: 21 }] } : null),
  claimsForScan: async () => [{ payment_ref: "MMMMMMMMMMMM1", amount: 12.6 }],
  driverExtras: async () => ({ ...D.extras }),
  hasTerminalPin: async () => ({ set: true }),
  terminalPayments: async () => D.payments,
  shiftReports: async () => D.reports,
  profileExtras: async () => ({ reference: "SD-4521", authorityExpires: "2027-03-14", since: "2026-11-08T10:02:00Z", midLast4: "0002" }),
  meterTrips: async (d, from, to, limit) => { D.tripArgs = { d, from, to, limit }; return D.trips || []; },
  jobsOn: async (kh) => kh === sha(KEY) && D.jobs === true,
} });
mock.module("@/lib/data/terminalPay", { namedExports: {
  isKey: (k) => typeof k === "string" && /^[0-9a-f]{64}$/.test(k), keyHash: sha,
  paymentById: async (id) => ({ id, status: "succeeded", charge_id: "ch_1" }),
} });
const sent = [];
mock.module("@/lib/terminal/settle", { namedExports: { sendShare: async (row) => { sent.push(row.id); return row; } } });
mock.module("@/lib/data/drivers", { namedExports: { findDriverById: async (id) => ({ id, driverId: "TC-1", name: "Ali Khan", phone: "0412345678", email: "ali@gmail.com", status: "active" }) } });
mock.module("@/lib/data/payments", { namedExports: { getDriverSummary: async () => ({ availableBalance: 40.25 }) } });
const withdrawals = [];
mock.module("@/lib/data/withdrawals", { namedExports: { recordWithdrawal: async (d, { amount }) => { withdrawals.push({ d, amount }); return { id: "w1", amount, status: "processing", date: "2026-11-09T00:00:00Z" }; } } });
const cashouts = [];
mock.module("@/lib/terminal/cardMoney", { namedExports: {
  cardMoney: async () => ({ account: { ready: true }, balance: { available: 55.1, onTheWay: 20 }, instant: { on: true, max: 54.55, feeOnMax: 0.55, note: null }, stripeError: null }),
  cashOut: async (driver, a) => { cashouts.push(a); return { status: 200, payout: { id: "po_x", amount: 10 } }; },
} });
const codes = { sms: [], email: [], smsOn: true, smsFail: false, check: "ok" };
mock.module("@/lib/loginCode", { namedExports: {
  smsCodesEnabled: () => codes.smsOn,
  sendLoginCodeSms: async (d) => { if (codes.smsFail) throw new Error("code sms not sent: twilio 21608 secret detail"); codes.sms.push(d.id); },
  sendLoginCode: async (d) => { codes.email.push(d.id); },
  checkLoginCode: async () => codes.check,
} });
let who = { id: "d1", name: "Ali Khan", status: "active" };
mock.module("@/lib/driverAuth", { namedExports: { driverFromRequest: async () => who } });

const menu = await import("../app/api/terminal/menu/route.js");
const scan = await import("../app/api/driver/takings-scan/route.js");
const M = await import("../lib/terminal/menu.js");

const post = async (body) => { const r = await menu.POST(new Request("http://x/api/terminal/menu", { method: "POST", body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
const scanPost = async (body) => { const r = await scan.POST(new Request("http://x/api/driver/takings-scan", { method: "POST", body: JSON.stringify(body), headers: { "user-agent": "Pixel 7" } })); return { status: r.status, j: await r.json() }; };
async function signedIn() {
  D.state.needsCode = false; D.state.hasPin = true;
  const r = await post({ action: "signin", key: KEY, pin: "4826" });
  assert.equal(r.status, 200);
  return r.j.session;
}

beforeEach(() => { reset(); allow = true; codes.sms = []; codes.email = []; codes.smsOn = true; codes.smsFail = false; codes.check = "ok"; withdrawals.length = 0; cashouts.length = 0; sent.length = 0; who = { id: "d1", name: "Ali Khan", status: "active" }; });

// ---- pure helpers ------------------------------------------------------------------------------------
test("M1 a shift report from its QR or its typed number", () => {
  const code = "AbCdEfGhIjKlMnOpQrStUv";
  assert.deepEqual(M.parseReport(`SR-000123.${code}`), { number: "SR-000123", code });
  assert.deepEqual(M.parseReport("sr 123"), { number: "SR-000123", code: null });
  assert.deepEqual(M.parseReport(" 000123 "), { number: "SR-000123", code: null });
  assert.equal(M.parseReport("SR-12.short"), null);
  assert.equal(M.parseReport("https://evil.example/SR-1"), null);
  assert.equal(M.parseReport(""), null);
  assert.equal(M.reportQrText("SR-000007", code), `SR-000007.${code}`);
});

test("M2 masks, PIN and code shapes, and the list from the terminal", () => {
  assert.equal(M.maskPhone("0412 345 678"), "04•• ••• 678");
  assert.equal(M.maskEmail("ali@gmail.com"), "a••@gmail.com");
  assert.ok(M.isPin("0482") && !M.isPin("482") && !M.isPin("48a2"));
  assert.ok(M.isCode("123 456") && !M.isCode("12345"));
  assert.equal(M.isSessionToken(M.newSessionToken()), true);
  assert.deepEqual(M.cleanItems([{ ref: "ABCDEFGHJKMN1", cents: 1050 }], "clover"), [{ ref: "ABCDEFGHJKMN1", cents: 1050, voided: false }]);
  assert.equal(M.cleanItems([{ ref: "pi_123" }], "clover"), null);
  assert.equal(M.cleanItems([{ ref: "ABCDEFGHJKMN1" }], "stripe"), null);
  assert.equal(M.cleanItems(new Array(501).fill({ ref: "ABCDEFGHJKMN1" }), "clover"), null);
  assert.match(M.problemText("locked", { until: "2026-11-09T05:15:00Z" }), /locked until 4:15/);
});

test("M3 the driver sees the fare, never the service fee or the card total", () => {
  assert.deepEqual(M.cloverPaymentView({ clover_payment_id: "X", paid_at: "t", total: 21, fee_included: true, fare_before_fee: 20, status: "credited", card_type: "VISA", last4: "9969" }),
    { ref: "X", at: "t", fare: 20, card: "VISA ••9969", state: "in" });
  assert.equal(M.cloverPaymentView({ total: 10.5, voided: true }).state, "voided");
  assert.deepEqual(M.stripePaymentView({ payment_intent_id: "pi_1", status: "succeeded", fare_cents: 2000, amount_cents: 2100, refunded_cents: 0, transfer_status: "failed", card_brand: "visa", card_last4: "4242" }),
    { ref: "pi_1", at: undefined, fare: 20, card: "VISA ••4242", state: "waiting" });
});

// ---- signing in --------------------------------------------------------------------------------------
test("T1 the key and the action are checked first", async () => {
  assert.equal((await post({ action: "hello" })).status, 400);
  assert.equal((await post({ action: "nope", key: KEY })).status, 400);
  const r = await post({ action: "hello", key: KEY2 });
  assert.equal(r.status, 409); assert.equal(r.j.problem, "not_paired"); assert.match(r.j.error, /not set up/);
});

test("T2 hello says who and what is needed - no ids, no ABN", async () => {
  const r = await post({ action: "hello", key: KEY });
  assert.equal(r.status, 200);
  assert.deepEqual(r.j, { ok: true, terminal: "Dev kit", provider: "clover", plate: "T1234", firstName: "Ali", needsCode: true, hasPin: false, lockedUntil: null, jobs: false });
});

test("T3 the code: SMS to a masked number; a failed send never shows its inner error", async () => {
  let r = await post({ action: "code", key: KEY, channel: "sms" });
  assert.equal(r.j.sentTo, "04•• ••• 678"); assert.deepEqual(codes.sms, ["d1"]);
  r = await post({ action: "code", key: KEY, channel: "email" });
  assert.equal(r.j.sentTo, "a••@gmail.com");
  codes.smsFail = true;
  r = await post({ action: "code", key: KEY, channel: "sms" });
  assert.equal(r.status, 502); assert.doesNotMatch(r.j.error, /twilio|secret/);
  codes.smsOn = false;
  r = await post({ action: "code", key: KEY, channel: "sms" });
  assert.equal(r.status, 409); assert.match(r.j.error, /Choose email/);
  allow = false;
  assert.equal((await post({ action: "code", key: KEY })).status, 429);
});

test("T4 code right -> the terminal knows him; no PIN yet -> a PIN ticket for this driver and terminal only", async () => {
  codes.check = "wrong";
  let r = await post({ action: "checkCode", key: KEY, code: "123456" });
  assert.equal(r.status, 400); assert.equal(D.calls.length, 0);
  codes.check = "ok";
  r = await post({ action: "checkCode", key: KEY, code: "123 456" });
  assert.equal(r.status, 200); assert.equal(r.j.needsCode, false); assert.ok(r.j.pinTicket);
  assert.deepEqual(D.calls[0], ["codePassed", "d1"]);
  // the ticket sets the PIN
  r = await post({ action: "setPin", key: KEY, pin: "4826", pinTicket: r.j.pinTicket });
  assert.equal(r.status, 200); assert.deepEqual(D.pinSet, [{ d: "d1", pin: "4826", via: "terminal" }]);
  // a ticket is no use once the terminal is given to someone else
  const t = (await post({ action: "checkCode", key: KEY, code: "123456" })).j.pinTicket;
  D.state.driverId = "d2";
  r = await post({ action: "setPin", key: KEY, pin: "5937", pinTicket: t });
  assert.equal(r.status, 401); assert.equal(D.pinSet.length, 1);
  // and no ticket, no session: refused
  assert.equal((await post({ action: "setPin", key: KEY, pin: "5937" })).status, 401);
});

test("T5 sign in: a wrong PIN says the tries left; a right one gives a session the database only sees hashed", async () => {
  D.state.needsCode = false; D.state.hasPin = true;
  D.pinResult = { ok: false, problem: "wrong_pin", triesLeft: 2 };
  let r = await post({ action: "signin", key: KEY, pin: "0000" });
  assert.equal(r.status, 401); assert.equal(r.j.error, "Wrong PIN. 2 tries left.");
  D.pinResult = { ok: false, problem: "locked", until: "2026-11-09T05:15:00Z", needsCode: true };
  r = await post({ action: "signin", key: KEY, pin: "0000" });
  assert.equal(r.status, 409); assert.match(r.j.error, /new TaxiCharg code/);
  D.pinResult = null;
  r = await post({ action: "signin", key: KEY, pin: "4826" });
  assert.equal(r.status, 200); assert.ok(M.isSessionToken(r.j.session));
  const th = D.calls.at(-1)[2];
  assert.equal(th, sha(r.j.session)); assert.notEqual(th, r.j.session);
  // tc-0023: signing in here ends his menu on any other terminal (and only after a right PIN)
  assert.deepEqual(endedOther, [[D.state.driverId, "s1"]]);
});

// ---- signed in ---------------------------------------------------------------------------------------
test("T6 a session works only on its own terminal, and only while that terminal is still his", async () => {
  assert.equal((await post({ action: "me", key: KEY, session: "x" })).status, 401);
  const s = await signedIn();
  assert.equal((await post({ action: "me", key: KEY2, session: s })).status, 401);
  D.state.driverId = "d2";   // the office gave the terminal to someone else
  assert.equal((await post({ action: "me", key: KEY, session: s })).status, 401);
});

test("T7 me: Clover = a cash-out request; S710 = automatic, with Instant; no account ids", async () => {
  const s = await signedIn();
  let r = await post({ action: "me", key: KEY, session: s });
  assert.equal(r.j.money.kind, "request"); assert.equal(r.j.money.available, 40.25);
  assert.equal(r.j.abn, "51824753556"); assert.equal(r.j.receiptTaxi, "TC123");   // tc-0022: his own taxi number wins
  D.extras.taxiNumber = ""; r = await post({ action: "me", key: KEY, session: s });
  assert.equal(r.j.receiptTaxi, "T1234");   // none of his own: the paired cab's
  D.extras.taxiNumber = "TC123";
  D.state.provider = "stripe"; D.state.plate = null;
  r = await post({ action: "me", key: KEY, session: s });
  assert.equal(r.j.money.kind, "automatic"); assert.equal(r.j.money.instant.max, 54.55); assert.equal(r.j.receiptTaxi, "TC123");
  assert.doesNotMatch(JSON.stringify(r.j), /acct_|account_id/);
});

test("T8 profile: ABN and taxi number go through 362 as 'terminal'; its refusal reaches the driver", async () => {
  const s = await signedIn();
  let r = await post({ action: "profile", key: KEY, session: s, abn: "53 004 085 616", taxiNumber: "t 1234" });
  assert.equal(r.status, 200);
  assert.deepEqual(D.profile[0], { d: "d1", p: { abn: "53 004 085 616", taxiNumber: "t 1234" }, via: "terminal", by: "Ali Khan (on the terminal)" });
  r = await post({ action: "profile", key: KEY, session: s, taxiNumber: "TX99" });
  assert.equal(r.j.taxiNumber, "TX99"); assert.equal(r.j.receiptTaxi, "TX99");   // tc-0022: what he saved is what he sees, not the paired T1234
  D.profile.length = 1;
  r = await post({ action: "profile", key: KEY, session: s, abn: "123" });
  assert.equal(r.status, 400); assert.equal(r.j.error, "That ABN is not right. Check the 11 digits.");
  assert.equal((await post({ action: "profile", key: KEY, session: s })).status, 400);
});

test("T9 payments: the fare only", async () => {
  const s = await signedIn();
  D.payments = [{ clover_payment_id: "X", paid_at: "t", total: 21, fee_included: true, fare_before_fee: 20, status: "credited" }];
  const r = await post({ action: "payments", key: KEY, session: s });
  assert.equal(r.j.payments[0].fare, 20); assert.doesNotMatch(JSON.stringify(r.j), /"total"|21/);
});

test("T10 shift report: the QR holds the number and a random code; the database only gets its hash; no card total on the S710", async () => {
  const s = await signedIn();
  assert.equal((await post({ action: "report", key: KEY, session: s, items: [{ ref: "pi_bad" }] })).status, 400);
  let r = await post({ action: "report", key: KEY, session: s, items: [{ ref: "ABCDEFGHJKMN1", cents: 1050 }] });
  assert.equal(r.status, 200);
  const code = r.j.qr.split(".")[1];
  assert.equal(r.j.qr, `SR-000007.${code}`); assert.equal(code.length, 22);
  assert.equal(D.reportArgs.codeHash, sha(code)); assert.equal(D.reportArgs.th, sha(s));
  assert.equal(r.j.cardTotal, 31.5);
  D.state.provider = "stripe";
  r = await post({ action: "report", key: KEY, session: s, items: [] });
  assert.equal("cardTotal" in r.j, false);
});

test("T11 cash out: on hold refused; Clover = request within the balance; S710 = straight to his bank", async () => {
  const s = await signedIn();
  D.extras.onHold = true;
  assert.equal((await post({ action: "cashout", key: KEY, session: s })).status, 403);
  D.extras.onHold = false;
  let r = await post({ action: "cashout", key: KEY, session: s, amountCents: 5000 });
  assert.equal(r.status, 400); assert.match(r.j.error, /Only \$40\.25/);
  r = await post({ action: "cashout", key: KEY, session: s });
  assert.equal(r.j.kind, "request"); assert.deepEqual(withdrawals, [{ d: "d1", amount: 40.25 }]);
  D.state.provider = "stripe";
  r = await post({ action: "cashout", key: KEY, session: s, requestId: "req_1234567890abcdef", method: "instant", amountCents: 1000 });
  assert.equal(r.j.kind, "automatic"); assert.deepEqual(cashouts[0], { requestId: "req_1234567890abcdef", amountCents: 1000, method: "instant" });
  assert.equal(withdrawals.length, 1);
});

test("T12 sign out ends the session", async () => {
  const s = await signedIn();
  await post({ action: "signout", key: KEY, session: s });
  assert.equal((await post({ action: "me", key: KEY, session: s })).status, 401);
});

// ---- takings by QR -----------------------------------------------------------------------------------
const CODE = "AbCdEfGhIjKlMnOpQrStUv";
test("Q1 not a report -> told how; refused -> the reason, nothing else", async () => {
  let r = await scanPost({ text: "hello" });
  assert.equal(r.status, 400);
  D.scan = { ok: false, scanId: "s", refused: "This shift report is another driver's." };
  r = await scanPost({ text: `SR-000001.${CODE}` });
  assert.deepEqual(r.j, { ok: false, refused: "This shift report is another driver's." });
  assert.equal(D.scanArgs.codeHash, sha(CODE)); assert.equal(D.scanArgs.method, "camera"); assert.equal(D.scanArgs.byDriver, "d1");
  await scanPost({ text: "SR-000001", method: "camera" });
  assert.equal(D.scanArgs.codeHash, null); assert.equal(D.scanArgs.method, "typed");
});

test("Q2 S710: a share not sent is sent and credited now, once; the scan closes", async () => {
  D.scan = { ok: true, scanId: "s2", report: { number: "SR-000002", provider: "stripe", from: "f", to: "t" }, items: [
    { ref: "pi_A", state: "already_in", amount: 20.3 }, { ref: "pi_B", state: "not_credited", amount: 10.15, paymentId: "p_b" }, { ref: "pi_C", state: "voided", amount: 7.8 }] };
  const r = await scanPost({ text: `SR-000002.${CODE}`, method: "photo" });
  assert.equal(r.status, 200); assert.equal(r.j.closed, true);
  assert.deepEqual(sent, ["p_b"]); assert.deepEqual(D.claims, ["pi_B"]); assert.deepEqual(D.closed, ["s2"]);
  assert.deepEqual(r.j.summary, { found: 3, creditedNow: 1, creditedAmount: 10.15, alreadyIn: 1, voided: 1, checking: 0, notFound: 0, otherDriver: 0, refused: 0 });
});

test("Q3 Clover: payments not in yet are left for the Clover read; the scan stays open; asking again shows what came in", async () => {
  D.scan = { ok: true, scanId: "11111111-1111-1111-1111-111111111111", report: { number: "SR-000001", provider: "clover", from: "f", to: "t" },
    items: [{ ref: "MMMMMMMMMMMM1", state: "not_seen" }, { ref: "AAAAAAAAAAAA1", state: "already_in", amount: 21 }] };
  let r = await scanPost({ text: `SR-000001.${CODE}` });
  assert.equal(r.j.closed, false); assert.equal(r.j.checking, 1); assert.deepEqual(D.closed, []); assert.deepEqual(sent, []);
  const g = await scan.GET(new Request("http://x/api/driver/takings-scan?scan=11111111-1111-1111-1111-111111111111"));
  const j = await g.json();
  assert.equal(j.summary.creditedNow, 1); assert.equal(j.summary.creditedAmount, 12.6); assert.equal(j.checking, 0);
  // another driver cannot read it
  who = { id: "d9", name: "X", status: "active" };
  assert.equal((await scan.GET(new Request("http://x/api/driver/takings-scan?scan=11111111-1111-1111-1111-111111111111"))).status, 404);
});

// ---- tc-0020: trips and the meter's side of the shift report ---------------------------------------------
const TRIPS = [
  { id: "m1", ended_at: "2026-11-09T03:41:00Z", hail: true, job_no: 10412, pickup_text: "12 Smith St, Auburn NSW 2144", dropoff_text: "Lidcombe NSW 2141, Australia", total_cents: 1808, levy_cents: 132, distance_m: 7400, payment_method: "card" },
  { id: "m2", ended_at: "2026-11-09T02:55:00Z", hail: true, job_no: 10409, pickup_text: "Auburn", dropoff_text: "Auburn", total_cents: 940, levy_cents: 132, distance_m: 2100, payment_method: "cash" },
  { id: "m3", ended_at: "2026-11-09T01:12:00Z", hail: false, job_no: null, receipt_no: "SB-36QT6V", pickup_text: "Mascot", dropoff_text: "Greenacre", total_cents: 5430, levy_cents: 132, distance_m: 21500, payment_method: "account" },
  { id: "m4", ended_at: "2026-11-09T00:20:00Z", hail: true, job_no: 10398, total_cents: 2715, levy_cents: 132, distance_m: 9000, payment_method: "cash", false_job_at: "2026-11-09T00:30:00Z" },
];

test("M4 suburbs, trips and the meter totals (a voided or false job does not count)", () => {
  assert.equal(M.suburbOf("12 Smith St, Auburn NSW 2144"), "Auburn");
  assert.equal(M.suburbOf("Lidcombe NSW 2141, Australia"), "Lidcombe");
  assert.equal(M.suburbOf(""), "");
  assert.deepEqual(M.tripView(TRIPS[0]), { id: "m1", at: "2026-11-09T03:41:00Z", no: "HAIL #10412", from: "Auburn", to: "Lidcombe", total: 18.08, paid: "card", voided: false });
  assert.equal(M.tripView(TRIPS[2]).no, "SB-36QT6V");
  assert.equal(M.tripView(TRIPS[3]).voided, true);
  assert.deepEqual(M.meterFigures(TRIPS), { trips: 3, meterFares: 81.78, card: 18.08, cash: 9.4, other: 54.3, levy: 3.96, km: 31 });
});

test("T13 trips: today in Sydney, newest first, with the totals", async () => {
  const s = await signedIn();
  D.trips = TRIPS;
  const r = await post({ action: "trips", key: KEY, session: s });
  assert.equal(r.status, 200); assert.equal(r.j.trips.length, 4); assert.equal(r.j.totals.trips, 3);
  assert.equal(D.tripArgs.d, "d1");
  const fromH = new Date(D.tripArgs.from).getTime(), now = Date.now();
  assert.ok(now - fromH < 25 * 3600e3 && now >= fromH, "from = Sydney midnight today");
  assert.doesNotMatch(JSON.stringify(r.j), /Smith St/);   // suburbs only, never the street address
});

test("T14 the shift report carries the meter's side of the same period; me shows the GM profile", async () => {
  const s = await signedIn();
  D.trips = TRIPS;
  let r = await post({ action: "report", key: KEY, session: s, items: [] });
  assert.deepEqual(r.j.meter, { trips: 3, meterFares: 81.78, card: 18.08, cash: 9.4, other: 54.3, levy: 3.96, km: 31 });
  assert.deepEqual([D.tripArgs.from, D.tripArgs.to, D.tripArgs.limit], ["f", "t", 2000]);
  r = await post({ action: "me", key: KEY, session: s });
  assert.equal(r.j.mid, "****0002"); assert.equal(r.j.authorityExpires, "2027-03-14"); assert.equal(r.j.since, "2026-11-08T10:02:00Z");
});

test("T15 the office's jobs switch: off unless 363 says on, in hello and in me", async () => {
  assert.equal((await post({ action: "hello", key: KEY })).j.jobs, false);
  D.jobs = true;
  assert.equal((await post({ action: "hello", key: KEY })).j.jobs, true);
  const s = await signedIn();
  assert.equal((await post({ action: "me", key: KEY, session: s })).j.jobs, true);
  D.jobs = false;
  assert.equal((await post({ action: "me", key: KEY, session: s })).j.jobs, false);
});

// tc-0024 tests: GET PAID on a scanned shift report - 368's functions, Stripe and the sign-in replaced by fakes. Run: npm test
import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
const { NextResponse } = await import("next/server");

let allow = true, who = null;
mock.module("@/lib/protect", { namedExports: { rateHit: async () => allow, tooMany: (m) => NextResponse.json({ error: m }, { status: 429 }), clientIp: () => "x" } });
mock.module("@/lib/driverAuth", { namedExports: { driverFromRequest: async () => who } });

const D = {};
const REP = "11111111-2222-3333-4444-555555555555";
function share(provider, toPay, extra = {}) {
  return { reportId: REP, number: "SR-000004", provider, driverId: "d1", terminalId: "t1", items: [{ ref: "A", state: "to_pay" }],
    toPay, paidBefore: {}, lastPaid: null, ...extra };
}
mock.module("@/lib/data/reportPay", { namedExports: {
  reportShare: async (id) => (id === REP ? D.share : null),
  reportPay: async (rep, d, name, req, expect, dest) => { D.payArgs.push({ rep, d, name, req, expect, dest }); return D.pay(req, dest); },
  reportPayDone: async (id, ok, po, reason) => { D.done.push({ id, ok, po, reason }); },
  payView: (await import("../lib/data/reportPay.js")).payView,
  cloverFares: async () => null,
} });
const cashouts = [];
const cards = [];
mock.module("@/lib/driverCard", { namedExports: { driverCardOn: () => D.cardSite === true, sendToCard: async (driver, a) => { cards.push(a); return D.card; } } });
mock.module("@/lib/terminal/cardMoney", { namedExports: { cashOut: async (driver, a) => { cashouts.push(a); return D.cash; }, cardMoney: async () => ({}) } });

const route = await import("../app/api/driver/takings-pay/route.js");
const post = async (body) => { const r = await route.POST(new Request("http://x/api/driver/takings-pay", { method: "POST", body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
const get = async (q) => { const r = await route.GET(new Request("http://x/api/driver/takings-pay?" + q)); return { status: r.status, j: await r.json() }; };
const REQ = "req_1234567890abcdef";

beforeEach(() => {
  allow = true; who = { id: "d1", name: "Aslam S.", status: "active" }; cashouts.length = 0; cards.length = 0; D.cardSite = false; D.card = { transferId: "oxy_1" };
  Object.assign(D, { payArgs: [], done: [], share: share("clover", { payments: 1, amount: 23.55, card: 24.73, serviceFee: 1.18, commission: 0, refunded: 0 }),
    pay: () => ({ ok: true, provider: "clover", status: "made", amount: 23.55, payments: 1, number: "SR-000004", payoutId: "p1" }), cash: { status: 200, payout: { id: "po_1" } } });
});

test("G1 signed in, active, and a real report and press id", async () => {
  who = null; assert.equal((await post({ reportId: REP, requestId: REQ })).status, 401);
  who = { id: "d1", status: "inactive" }; assert.equal((await post({ reportId: REP, requestId: REQ })).status, 403);
  who = { id: "d1", status: "active" };
  assert.equal((await post({ reportId: "x", requestId: REQ })).status, 400);
  assert.equal((await post({ reportId: REP, requestId: "short" })).status, 400);
  assert.equal((await post({ reportId: REP, requestId: REQ, expect: "abc" })).status, 400);
  allow = false; assert.equal((await post({ reportId: REP, requestId: REQ })).status, 429);
  assert.equal(D.payArgs.length, 0);
});

test("G2 Clover: the payout request is made by 368 - no Stripe call", async () => {
  const r = await post({ reportId: REP, requestId: REQ, expect: 23.55 });
  assert.equal(r.j.ok, true); assert.equal(r.j.paid.amount, 23.55); assert.equal(r.j.paid.number, "SR-000004");
  assert.deepEqual(D.payArgs[0], { rep: REP, d: "d1", name: "Aslam S.", req: REQ, expect: 23.55, dest: "bank" });
  assert.equal(cashouts.length, 0); assert.equal(D.done.length, 0);
});

test("G3 S710: the Stripe payout of exactly the report's share, same press id, then 368 is told made", async () => {
  D.pay = () => ({ ok: true, provider: "stripe", status: "pending", amount: 29.1, payments: 2, number: "SR-000005", payoutId: "p2" });
  const r = await post({ reportId: REP, requestId: REQ });
  assert.equal(r.j.ok, true);
  assert.deepEqual(cashouts[0], { requestId: REQ, amountCents: 2910, method: "standard" });
  assert.deepEqual(D.done[0], { id: "p2", ok: true, po: "po_1", reason: null });
});

test("G4 S710: a failed payout is reported failed (368 lets the payments go) and the driver sees why", async () => {
  D.pay = () => ({ ok: true, provider: "stripe", status: "pending", amount: 29.1, payments: 2, payoutId: "p3" });
  D.cash = { status: 400, error: "Only $10.00 is available to cash out now." };
  const r = await post({ reportId: REP, requestId: REQ });
  assert.equal(r.j.ok, false); assert.match(r.j.reason, /Only \$10\.00/);
  assert.deepEqual(D.done[0], { id: "p3", ok: false, po: null, reason: "Only $10.00 is available to cash out now." });
});

test("G5 S710 press again after it was made: no second payout", async () => {
  D.pay = () => ({ ok: true, again: true, provider: "stripe", status: "made", amount: 29.1, payments: 2, payoutId: "p2" });
  const r = await post({ reportId: REP, requestId: REQ });
  assert.equal(r.j.ok, true); assert.equal(cashouts.length, 0);
});

test("G6 refused by 368: the reason and the new figures come back, nothing paid", async () => {
  D.pay = () => ({ ok: false, changed: true, reason: "The figures changed. Check them and press GET PAID again.",
    share: share("clover", { payments: 2, amount: 33.55, card: 35.23, serviceFee: 1.68, commission: 0, refunded: 0 }) });
  const r = await post({ reportId: REP, requestId: REQ, expect: 23.55 });
  assert.equal(r.j.ok, false); assert.equal(r.j.changed, true); assert.equal(r.j.pay.toPay.amount, 33.55);
  assert.equal(cashouts.length, 0);
});

test("G7 what a report pays: his own only; the Service Fee is never on his report; the S710 shows only payments and To you", async () => {
  let r = await get("report=" + REP);
  assert.deepEqual(r.j.pay.toPay, { payments: 1, amount: 23.55, fares: 23.55, commission: 0, refunded: 0 });
  assert.equal(JSON.stringify(r.j).includes("1.18"), false); assert.equal(JSON.stringify(r.j).includes("24.73"), false);
  assert.equal("driverId" in r.j.pay, false);
  D.share = share("stripe", { payments: 2, amount: 29.1, card: null, serviceFee: null, commission: null, refunded: null });
  r = await get("report=" + REP);
  assert.deepEqual(r.j.pay.toPay, { payments: 2, amount: 29.1 });
  who = { id: "d2", status: "active" };
  assert.equal((await get("report=" + REP)).status, 404);
});

test("G8 nothing in the TaxiCharg words says SYD CABS or FareTap", async () => {
  const fs = await import("node:fs");
  for (const f of ["components/dashboard/GetPaid.js", "app/api/driver/takings-pay/route.js", "lib/data/reportPay.js", "app/dashboard/scan/page.js", "lib/driverCard.js"]) {
    const t = fs.readFileSync(new URL("../" + f, import.meta.url), "utf8").replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, "");
    assert.equal(/SYD CABS|SydCabs|FareTap/i.test(t), false, f);
  }
});

test("G9 the Driver Card: off -> refused before anything is held; on -> the card transfer, then 368 is told; a failed one is let go", async () => {
  let r = await post({ reportId: REP, requestId: REQ, destination: "card" });
  assert.equal(r.j.ok, false); assert.match(r.j.reason, /not switched on/); assert.equal(D.payArgs.length, 0);
  D.share = share("clover", { payments: 1, amount: 23.55, card: 24.73, serviceFee: 1.18, commission: 0, refunded: 0 }, { cardOn: true });
  assert.equal((await get("report=" + REP)).j.pay.cardOn, false);   // the site switch is off too
  D.cardSite = true;
  assert.equal((await get("report=" + REP)).j.pay.cardOn, true);
  D.pay = (req, dest) => ({ ok: true, provider: "clover", destination: dest, status: dest === "card" ? "pending" : "made", amount: 23.55, payments: 1, payoutId: "p9" });
  r = await post({ reportId: REP, requestId: REQ, destination: "card" });
  assert.equal(r.j.ok, true); assert.deepEqual(cards[0], { requestId: REQ, amountCents: 2355 });
  assert.deepEqual(D.done[0], { id: "p9", ok: true, po: "oxy_1", reason: null }); assert.equal(cashouts.length, 0);
  D.card = { error: "The TaxiCharg Driver Card is not connected yet. Choose your bank." };
  r = await post({ reportId: REP, requestId: "req_abcdefghijklmnop", destination: "card" });
  assert.equal(r.j.ok, false); assert.equal(D.done[1].ok, false);
});

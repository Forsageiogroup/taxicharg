import { NextResponse } from "next/server";
import { rateHit, clientIp } from "@/lib/protect";
import { isKey, keyHash } from "@/lib/data/terminalPay";
import { findDriverById } from "@/lib/data/drivers";
import { getDriverSummary } from "@/lib/data/payments";
import { recordWithdrawal } from "@/lib/data/withdrawals";
import { cardMoney, cashOut } from "@/lib/terminal/cardMoney";
import { sendLoginCode, sendLoginCodeSms, smsCodesEnabled, checkLoginCode } from "@/lib/loginCode";
import { signState, verifyState } from "@/lib/auth";
import * as M from "@/lib/data/terminalMenu";
import {
  sha256, newSessionToken, isSessionToken, newReportCode, reportNumber, reportQrText, isPin, isCode,
  maskPhone, maskEmail, problemText, cloverPaymentView, stripePaymentView, cleanItems, tripView, meterFigures,
} from "@/lib/terminal/menu";
import { sydneyDay, sydneyMidnight } from "@/lib/time/sydney";

/**
 * tc-0019 (9 Nov 2026): the driver's menu on his terminal - FareTap on the Clover and the TaxiCharg app on the
 * S710 call this same address. The owner: "the driver can see his profile when assgined to him, alon shift end
 * report, any jobs, transactions, cash out recipt, and edit the taxi number and abn field"; "4 digit along
 * taxicharg code"; on the S710 "the driver can cash out automatic".
 *
 *   POST { action, key, ... }      key = the terminal app's own key (paired by the office, as for card payments)
 *
 *   hello                               -> who the terminal is given to and what he needs to sign in; jobs: the office's switch
 *   code      { channel: sms|email }    -> sends his TaxiCharg code (the first time on this terminal)
 *   checkCode { code }                  -> the terminal knows him from now on; { pinTicket } if he has no PIN yet
 *   setPin    { pin, pinTicket | session }
 *   signin    { pin }                   -> { session }   (only the sha256 of it is kept)
 *   me        { session }               -> name, ABN, taxi number, terminal, cab, money on this terminal's side
 *   profile   { session, abn?, taxiNumber? }
 *   payments  { session }               -> his card payments on this terminal, last 14 days (the fare only)
 *   trips     { session }               -> tc-0020: his meter trips today (Sydney) and their totals
 *   report    { session, items }        -> a shift report: { number, qr, from, to, payments, voided }
 *   reports   { session }               -> his last shift reports on this terminal
 *   cashout   { session, requestId, amountCents?, method? }
 *                                          Clover: a request the office pays (as the website's Withdraw).
 *                                          S710: straight from his payout account (Instant or Free, tc-0016/0018).
 *   signout   { session }
 *
 * The terminal app never says who the driver is: the server works it out from the register (the driver the
 * terminal is given to NOW) and 362's sign-in. Money is never taken from what the terminal says.
 */
const ACTIONS = new Set(["hello", "code", "checkCode", "setPin", "signin", "me", "profile", "payments", "trips", "report", "reports", "cashout", "signout"]);
const SESSION_ACTIONS = new Set(["me", "profile", "payments", "trips", "report", "reports", "cashout", "signout"]);

const say = (error, status = 400, extra = {}) => NextResponse.json({ error, ...extra }, { status });
const fromErr = (e) => say(e?.message || "Try again.", e?.status || 500);

async function pinTicket(driverId, terminalId) {
  return signState({ kind: "tpin", sub: driverId, t: terminalId });
}
async function readPinTicket(token, driverId, terminalId) {
  const p = await verifyState(token);
  return Boolean(p && p.kind === "tpin" && p.sub === driverId && p.t === terminalId);
}

function stateView(st) {
  return {
    terminal: st.terminal, provider: st.provider, plate: st.plate || null, firstName: st.firstName,
    needsCode: st.needsCode === true, hasPin: st.hasPin === true, lockedUntil: st.lockedUntil || null,
  };
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return say("Bad request."); }
  const key = body?.key;
  if (!isKey(key)) return say("The terminal key is missing.");
  const action = String(body.action || "");
  if (!ACTIONS.has(action)) return say("Unknown action.");
  if (!(await rateHit(`tc-menu-ip:${clientIp(request)}`, 600, 3600))) return say("Too many requests. Wait a minute.", 429);
  const kh = keyHash(key);
  if (!(await rateHit(`tc-menu-term:${kh.slice(0, 32)}`, 300, 3600))) return say("Too many requests from this terminal. Wait a minute.", 429);

  try {
    // ── signed-in actions ─────────────────────────────────────────────────────────────────────────
    if (SESSION_ACTIONS.has(action)) {
      if (!isSessionToken(body.session)) return say("Sign in again.", 401);
      const th = sha256(body.session);
      if (action === "signout") { await M.signout(kh, th); return NextResponse.json({ ok: true }); }
      const driverId = await M.sessionDriver(kh, th);
      if (!driverId) return say("Sign in again.", 401);
      const st = await M.signinState(kh);
      if (!st?.ok || st.driverId !== driverId) return say("Sign in again.", 401);
      return await signedIn(action, body, { kh, th, st, driverId });
    }

    // ── signing in ────────────────────────────────────────────────────────────────────────────────
    const st = await M.signinState(kh);
    if (!st?.ok) return say(problemText(st?.problem), 409, { problem: st?.problem || "unknown" });

    if (action === "hello") return NextResponse.json({ ok: true, ...stateView(st), jobs: await M.jobsOn(kh) });   // tc-0020: the office's switch

    if (action === "code") {
      if (!(await rateHit(`tc-menu-code:${st.driverId}`, 5, 3600))) return say("Too many codes in an hour. Wait, then try again.", 429);
      const driver = await findDriverById(st.driverId);
      if (!driver) return say(problemText("no_driver"), 409);
      const channel = body.channel === "email" ? "email" : "sms";
      if (channel === "sms") {
        if (!smsCodesEnabled() || !driver.phone) return say("A text message cannot be sent. Choose email.", 409);
        try { await sendLoginCodeSms(driver); }
        catch (e) { console.error("[terminal menu] code sms", e.message || e); return say("The text message could not be sent. Choose email.", 502); }
        return NextResponse.json({ ok: true, sentTo: maskPhone(driver.phone) });
      }
      if (!driver.email) return say("There is no email address on your record. Contact the office.", 409);
      try { await sendLoginCode(driver); }
      catch (e) { console.error("[terminal menu] code email", e.message || e); return say("The email could not be sent. Try a text message, or contact the office.", 502); }
      return NextResponse.json({ ok: true, sentTo: maskEmail(driver.email) });
    }

    if (action === "checkCode") {
      if (!isCode(String(body.code || ""))) return say("The code is 6 digits.");
      if (!(await rateHit(`tc-menu-check:${st.driverId}`, 20, 3600))) return say("Too many tries. Wait, then try again.", 429);
      const r = await checkLoginCode(st.driverId, String(body.code).replace(/\s/g, ""));
      if (r !== "ok") return say(r === "wrong" ? "That code is not right." : "That code has run out. Ask for a new one.", 400, { problem: r });
      const after = await M.codePassed(kh, st.driverId, body.channel === "email" ? "email code" : "sms code");
      if (!after?.ok) return say(problemText(after?.problem), 409, { problem: after?.problem });
      const out = { ok: true, ...stateView(after) };
      if (!after.hasPin) out.pinTicket = await pinTicket(st.driverId, st.terminalId);
      return NextResponse.json(out);
    }

    if (action === "setPin") {
      if (!isPin(body.pin)) return say("The PIN is 4 digits.");
      let allowed = false;
      if (typeof body.pinTicket === "string") allowed = await readPinTicket(body.pinTicket, st.driverId, st.terminalId);
      else if (isSessionToken(body.session)) allowed = (await M.sessionDriver(kh, sha256(body.session))) === st.driverId;
      if (!allowed || st.needsCode) return say("Enter the TaxiCharg code first.", 401, { problem: "needs_code" });
      await M.setPin(st.driverId, body.pin, "terminal");
      return NextResponse.json({ ok: true });
    }

    if (action === "signin") {
      if (!isPin(body.pin)) return say("The PIN is 4 digits.");
      const token = newSessionToken();
      const r = await M.signin(kh, body.pin, sha256(token));
      if (!r?.ok) return say(problemText(r?.problem, r || {}), r?.problem === "wrong_pin" ? 401 : 409, { problem: r?.problem, triesLeft: r?.triesLeft ?? null, until: r?.until || null });
      return NextResponse.json({ ok: true, session: token, expiresAt: r.expiresAt, firstName: st.firstName });
    }
    return say("Unknown action.");
  } catch (e) {
    return fromErr(e);
  }
}

async function signedIn(action, body, { kh, th, st, driverId }) {
  const provider = st.provider === "stripe" ? "stripe" : "clover";

  if (action === "me") {
    const [driver, extras, more, jobs] = await Promise.all([findDriverById(driverId), M.driverExtras(driverId), M.profileExtras(driverId, st.terminalId), M.jobsOn(kh)]);
    if (!driver || !extras) return say("Sign in again.", 401);
    const out = {
      ok: true, name: driver.name, driverId: driver.driverId, abn: extras.abn, taxiNumber: extras.taxiNumber,
      // tc-0020: the profile as the GM terminal shows it
      authorityExpires: more.authorityExpires, since: more.since, mid: more.midLast4 ? `****${more.midLast4}` : null,
      // tc-0022 (the owner, 9 Nov 2026: the taxi number he types is the one shown and printed): his own taxi number
      // wins; the paired cab's number is used only when he has not typed one
      receiptTaxi: extras.taxiNumber || st.plate || null,
      terminal: st.terminal, provider, plate: st.plate || null, onHold: extras.onHold, money: null,
      jobs,   // tc-0020: Jobs shows in the menu only while the office allows jobs on this terminal (363, terminal.jobs)
    };
    if (provider === "clover") {
      const s = await getDriverSummary(driverId);
      out.money = { kind: "request", available: s.availableBalance };
    } else {
      const m = await cardMoney(driver, { limit: 50 });
      out.money = { kind: "automatic", available: m.balance ? m.balance.available : null, onTheWay: m.balance ? m.balance.onTheWay : null,
        instant: m.instant ? { on: m.instant.on, max: m.instant.max, feeOnMax: m.instant.feeOnMax, note: m.instant.on ? null : m.instant.note || null } : null,
        ready: Boolean(m.account?.ready), error: m.stripeError || null };
    }
    return NextResponse.json(out);
  }

  if (action === "profile") {
    const abn = body.abn == null ? null : String(body.abn);
    const taxiNumber = body.taxiNumber == null ? null : String(body.taxiNumber);
    if (abn == null && taxiNumber == null) return say("Nothing to change.");
    const driver = await findDriverById(driverId);
    const r = await M.setProfile(driverId, { abn, taxiNumber }, "terminal", driver?.name ? `${driver.name} (on the terminal)` : null);
    return NextResponse.json({ ok: true, abn: r.abn || "", taxiNumber: r.taxiNumber || "", receiptTaxi: r.taxiNumber || st.plate || null });   // tc-0022: his own number first
  }

  if (action === "payments") {
    const rows = await M.terminalPayments(st.terminalId, driverId, provider);
    return NextResponse.json({ ok: true, payments: rows.map(provider === "stripe" ? stripePaymentView : cloverPaymentView) });
  }

  if (action === "trips") {
    const from = sydneyMidnight(sydneyDay()).toISOString(), to = new Date().toISOString();
    const rows = await M.meterTrips(driverId, from, to);
    return NextResponse.json({ ok: true, from, trips: rows.map(tripView), totals: meterFigures(rows) });
  }

  if (action === "report") {
    const items = cleanItems(body.items, provider);
    if (items == null) return say("The list of payments is not right.");
    const code = newReportCode();
    const r = await M.newShiftReport(kh, th, items, sha256(code));
    const out = { ok: true, number: r.number, qr: reportQrText(r.number, code), from: r.from, to: r.to, payments: r.payments, voided: r.voided };
    if (provider === "clover") out.cardTotal = r.cardTotal;   // the S710 driver side never shows the card total (31 Oct)
    // tc-0020: the meter's side of the same period, as GM's shift report (trips, fares, card, cash, levy, km)
    try { out.meter = meterFigures(await M.meterTrips(driverId, r.from, r.to, 2000)); }
    catch (e) { out.meter = null; console.error("[terminal menu] report meter", e.message || e); }
    return NextResponse.json(out);
  }

  if (action === "reports") {
    const rows = await M.shiftReports(st.terminalId, driverId);
    return NextResponse.json({ ok: true, reports: rows.map((r) => ({
      number: reportNumber(r.number), from: r.period_from, to: r.period_to, payments: r.payments, voided: r.voided,
      ...(provider === "clover" ? { cardTotal: Number(r.card_total) } : {}),
    })) });
  }

  if (action === "cashout") {
    const extras = await M.driverExtras(driverId);
    if (!extras || extras.status !== "active") return say("Your account is not active. Contact the office.", 403);
    if (extras.onHold) return say("Your account is on hold. Contact the office.", 403);
    if (!(await rateHit(`tc-cashout:${driverId}`, 10, 3600))) return say("Too many cash outs in an hour. Try again later.", 429);
    const driver = await findDriverById(driverId);
    if (provider === "stripe") {
      const r = await cashOut(driver, { requestId: body.requestId, amountCents: body.amountCents, method: body.method });
      return NextResponse.json(r.error ? { error: r.error } : { ok: true, kind: "automatic", payout: r.payout }, { status: r.status });
    }
    // Clover: a request the office pays from SYD CABS's bank, checked against Clover first (as the website's Withdraw)
    const s = await getDriverSummary(driverId);
    const avail = Math.round(Number(s.availableBalance || 0) * 100);
    const want = body.amountCents == null || body.amountCents === "" ? avail : Number(body.amountCents);
    if (!Number.isInteger(want) || want <= 0) return say(avail > 0 ? "Enter an amount." : "Nothing is available to cash out yet.");
    if (want > avail) return say(`Only $${(avail / 100).toFixed(2)} is available to cash out.`);
    const req = await recordWithdrawal(driverId, { amount: want / 100 });
    return NextResponse.json({ ok: true, kind: "request", payout: { id: req.id, amount: req.amount, status: req.status, at: req.date, arrival: "1-2 business days, paid by the office" } });
  }
  return say("Unknown action.");
}

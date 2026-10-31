import { NextResponse } from "next/server";
import { rateHit, clientIp } from "@/lib/protect";
import { stripeKeyProblem } from "@/lib/stripe";
import { checkFare, splitFare, surchargePct, typedMaxCents } from "@/lib/money/cardFare";
import { connectionTokenFor, createFareIntent, retrieveIntent } from "@/lib/stripeTerminal";
import { syncIntent, stopPayment } from "@/lib/terminal/settle";
import {
  isKey, terminalByKey, driverForPay, commissionRateFor, payoutAccountFor, meterTripForTaxi,
  paymentByRequest, paymentById, activePaymentForTrip, insertPayment, updatePayment,
} from "@/lib/data/terminalPay";

const ACTIONS = new Set(["hello", "token", "pay", "result"]);

/**
 * The TaxiCharg app on the S710 (tc-0015, 31 Oct 2026). One address, four steps:
 *
 *   POST { action: 'hello',  key }                          -> can this terminal take cards now, and for whom
 *   POST { action: 'token',  key }                          -> { secret } Stripe Terminal connection token
 *   POST { action: 'pay',    key, requestId, source, fareCents }
 *                                                           -> { paymentId, clientSecret, fare, surcharge, amount }
 *   POST { action: 'result', key, paymentId, outcome, message }
 *                                                           -> the payment as Stripe has it now
 *
 * `key` is the app's own long random key, made on the terminal the first time
 * it opens; the office pairs it in the panel (Terminals -> Pair) exactly as
 * for the meter mirror. Only its sha256 is in the register. The app never
 * says who is paid or how much he gets: the server works it out from the
 * register (the driver the terminal is allocated to NOW), his terms and his
 * payout account. Stripe is asked again for every outcome.
 */

const say = (error, status = 400, extra = {}) => NextResponse.json({ error, ...extra }, { status });

function firstName(full) { return String(full || "").trim().split(/\s+/)[0] || ""; }

/** Everything that must be true before a card is taken. Returns { ok, ...context } or { problem, message }. */
async function readiness(t) {
  if (!t) return { problem: "not_paired", message: "This terminal is not set up yet. Ask TaxiCharg to pair it with the code on the screen." };
  if (t.brand !== "stripe_s710" || !/^tmr_[A-Za-z0-9]+$/.test(t.readerId)) return { problem: "not_s710", message: "This terminal is not registered as a TaxiCharg card terminal. Ask TaxiCharg." };
  if (t.status !== "active") return { problem: "not_active", message: "This terminal is not in use (spare or faulty in the register). Ask TaxiCharg." };
  if (!t.usesCard) return { problem: "no_card", message: "Card payments are switched off for this terminal. Ask TaxiCharg." };
  const sp = stripeKeyProblem();
  if (sp) return { problem: "stripe_off", message: sp === "live_key_refused" ? "Card payments are switched off on this site (live key refused)." : "Card payments are not switched on yet. Ask TaxiCharg." };
  if (!t.driverId) return { problem: "no_driver", message: "This terminal is not given to a driver. Ask TaxiCharg to allocate it." };
  const driver = await driverForPay(t.driverId);
  if (!driver || driver.status !== "active") return { problem: "driver_not_active", message: "The driver of this terminal is not active. Ask TaxiCharg." };
  const acct = await payoutAccountFor(driver.id);
  if (!acct || acct.status !== "ready" || !/^acct_/.test(acct.account_id || "")) {
    return { problem: "payout_not_ready", message: "The driver's payout account is not ready. Open TaxiCharg -> Payout account and finish it.", driver };
  }
  return { ok: true, driver, acct };
}

function paymentView(row) {
  return {
    paymentId: row.id,
    status: row.status,
    source: row.source,
    fareCents: row.fare_cents,
    surchargeCents: row.surcharge_cents,
    surchargePct: Number(row.surcharge_pct),
    amountCents: row.amount_cents,
    card: row.card_last4 ? { brand: row.card_brand || "", last4: row.card_last4 } : null,
    // a card's own decline words help the driver; Stripe's internal errors do not go to the terminal
    message: row.status === "succeeded" ? null : row.status === "failed" ? "The card payment could not be started." : (row.failure_message || null),
    at: row.succeeded_at || row.created_at,
  };
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return say("Bad request."); }
  const key = body?.key;
  if (!isKey(key)) return say("The terminal key is missing.");
  const action = String(body.action || "");
  if (!ACTIONS.has(action)) return say("action must be 'hello', 'token', 'pay' or 'result'.");
  // per connection first (a stream of made-up keys), then per terminal: enough for a busy shift, not for a loop
  if (!(await rateHit(`tc-term-ip:${clientIp(request)}`, 1500, 3600))) return say("Too many requests. Wait a minute.", 429);
  let t;
  try { t = await terminalByKey(key); } catch { return say("TaxiCharg cannot be reached right now. Try again.", 503); }
  if (!t && action !== "hello") return say("This terminal is not set up. Ask TaxiCharg to pair it.", 403);
  if (t && !(await rateHit(`tc-term:${t.id}:${action}`, action === "hello" ? 600 : 240, 3600))) {
    return say("Too many requests from this terminal. Wait a minute.", 429);
  }

  try {
    if (action === "hello") {
      const r = await readiness(t);
      return NextResponse.json({
        ok: true,
        paired: Boolean(t),
        ready: Boolean(r.ok),
        problem: r.problem || null,
        message: r.message || null,
        terminal: t ? (t.label || t.serial) : null,
        plate: t?.plate || null,
        readerId: t?.readerId || null,
        driver: r.driver ? firstName(r.driver.full_name) : null,
        surchargePct: surchargePct(),
        typedMaxCents: typedMaxCents(),
        test: (process.env.STRIPE_SECRET_KEY || "").includes("_test_"),
      });
    }

    if (action === "token") {
      if (!t || t.brand !== "stripe_s710" || !/^tmr_/.test(t.readerId) || t.status !== "active") return say("This terminal is not a TaxiCharg card terminal.", 403);
      if (stripeKeyProblem()) return say("Card payments are not switched on yet.", 503);
      try {
        return NextResponse.json({ secret: await connectionTokenFor(t.readerId) });
      } catch (err) {
        if (err.noLocation) return say("This card reader is not registered to a location. Ask TaxiCharg.", 409);
        throw err;
      }
    }

    if (action === "pay") {
      const requestId = String(body.requestId || "");
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(requestId)) return say("The payment has no request id.");
      const r = await readiness(t);
      if (!r.ok) return say(r.message, 409, { problem: r.problem });
      const source = String(body.source || "");
      const chk = checkFare(source, body.fareCents);
      if (!chk.ok) return say(chk.error);

      // the same press sent again (the answer was lost): the same payment
      const same = await paymentByRequest(requestId);
      if (same) {
        if (same.terminal_id !== t.id) return say("That request belongs to another terminal.", 409);
        const now = same.payment_intent_id ? await syncIntent(same) : same;
        if (now.status === "succeeded") return say("This fare is already paid.", 409, { payment: paymentView(now) });
        if (!now.payment_intent_id || now.status === "canceled" || now.status === "failed") return say("That payment was stopped. Start it again.", 409);
        const pi = await retrieveIntent(now.payment_intent_id);
        return NextResponse.json({ ...paymentView(now), clientSecret: pi.client_secret });
      }

      let trip = null;
      if (source === "meter") {
        if (!t.taxiId) return say("This terminal is not fixed to a cab, so it cannot read a meter. Type the amount instead.");
        trip = await meterTripForTaxi(t.taxiId);
        if (!trip) return say("TaxiCharg cannot see this cab's meter trip. Type the amount from the meter instead.", 409);
        // the trip's driver must be the one this terminal pays (291: the terminal follows the driver on duty)
        if (trip.driver_id && trip.driver_id !== r.driver.id) {
          return say(`This terminal pays ${firstName(r.driver.full_name)}, but the meter trip is another driver's. Ask TaxiCharg to move the terminal to the driver on duty.`, 409);
        }
        // a trip already ended at the office has its total: the card is for exactly that
        if (trip.status === "ended" && Number(trip.total_cents) > 0 && Number(trip.total_cents) !== chk.fareCents) {
          return say(`The meter's total for this trip is $${(Number(trip.total_cents) / 100).toFixed(2)}, not $${(chk.fareCents / 100).toFixed(2)}. Charge it again from the meter.`, 409);
        }
        const open = await activePaymentForTrip(trip.id);
        if (open) {
          let now = open.payment_intent_id ? await syncIntent(open) : open;
          if (now.status === "succeeded") return say("This trip is already paid by card.", 409, { payment: paymentView(now) });
          if (now.status === "processing") return say("A card payment for this trip is still being processed. Wait a moment.", 409);
          if (now.status === "created") {
            // an earlier press for this trip was left open (the app was closed): stopped first - and only
            // when Stripe confirms it is stopped - never two at once
            now = await stopPayment(now, "Replaced by a new press on the S710.");
            if (now.status === "succeeded") return say("This trip is already paid by card.", 409, { payment: paymentView(now) });
            if (now.status !== "canceled") return say("The last card payment for this trip is still open on the card reader. Wait a moment and try again.", 409);
          }
        }
      }

      const rate = await commissionRateFor(r.driver.id);
      const s = splitFare(chk.fareCents, { pct: surchargePct(), commissionRate: rate });
      const ins = await insertPayment({
        request_id: requestId,
        terminal_id: t.id,
        reader_id: t.readerId,
        driver_id: r.driver.id,
        account_id: r.acct.account_id,
        source,
        meter_trip_id: trip ? trip.id : null,
        taxi_id: t.taxiId || null,
        fare_cents: s.fareCents,
        surcharge_pct: s.surchargePct,
        surcharge_cents: s.surchargeCents,
        amount_cents: s.amountCents,
        commission_rate: s.commissionRate,
        commission_cents: s.commissionCents,
        driver_share_cents: s.driverShareCents,
        livemode: Boolean(r.acct.livemode),
      });
      if (ins.clash === "trip") return say("A card payment for this trip has just been started. Wait a moment.", 409);
      if (ins.clash) return say("That request was already used. Start again.", 409);
      let row = ins.row;
      let pi;
      try {
        pi = await createFareIntent(row);
      } catch (err) {
        console.error("[terminal] create intent", row.id, err.message || err);
        await updatePayment(row.id, { status: "failed", failure_message: String(err.message || err).slice(0, 300) });
        return say("The card payment could not be started. Try again.", 502);
      }
      row = await updatePayment(row.id, { payment_intent_id: pi.id });
      return NextResponse.json({ ...paymentView(row), clientSecret: pi.client_secret });
    }

    if (action === "result") {
      if (!t) return say("This terminal is not set up.", 403);
      const row = await paymentById(String(body.paymentId || ""));
      if (!row || row.terminal_id !== t.id) return say("No such payment on this terminal.", 404);
      let now = row.payment_intent_id ? await syncIntent(row) : row;
      const outcome = String(body.outcome || "");
      if ((outcome === "canceled" || outcome === "failed") && now.status === "created") {
        // the passenger cancelled, or the card was declined and the driver gave up: stopped on Stripe too -
        // recorded as cancelled only when Stripe says so (a card taken meanwhile is recorded as paid)
        now = await stopPayment(now, String(body.message || (outcome === "canceled" ? "Cancelled on the terminal." : "Declined.")));
      }
      return NextResponse.json(paymentView(now));
    }

    return say("Unknown action.");
  } catch (err) {
    console.error("[terminal]", action, err.message || err);
    return say("TaxiCharg could not finish that. Try again.", 500);
  }
}

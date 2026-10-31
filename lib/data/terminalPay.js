/**
 * DATA LAYER - card fares taken on a TaxiCharg S710 (tc-0015, migration 320).
 * Server only: service_role. Nothing here is ever sent to a browser.
 *
 *   clover_terminals   the register (one row per terminal, Clover or S710);
 *                      the S710 app is known by its own key (only the key's
 *                      sha256 is stored, mirror_key_hash - the same pairing
 *                      the office already does in the panel)
 *   tc_card_payments   one row per card payment started on an S710 (320)
 *   tc_stripe_events   Stripe webhook events already handled (320)
 */
import { createHash } from "node:crypto";
import { db } from "@/lib/supabase";

function got(where, res) {
  if (res.error) console.error(`[terminalPay] ${where}:`, res.error.message || res.error);
  return res;
}

export const keyHash = (key) => createHash("sha256").update(String(key)).digest("hex");
export const isKey = (key) => typeof key === "string" && /^[0-9a-f]{64}$/.test(key);

const TERMINAL = "id, serial, label, status, brand, stripe_reader_id, uses_card, driver_id, taxi_id, taxi:taxi_id(plate)";

/** The terminal this app's key was paired to, or null. A returned terminal is never anybody's. */
export async function terminalByKey(key) {
  const res = got("terminal", await db().from("clover_terminals").select(TERMINAL)
    .eq("mirror_key_hash", keyHash(key)).neq("status", "returned").maybeSingle());
  if (res.error) throw new Error("The terminal register could not be read.");
  const t = res.data;
  if (!t) return null;
  return { id: t.id, serial: t.serial, label: t.label || "", status: t.status, brand: t.brand || "clover",
    readerId: t.stripe_reader_id || "", usesCard: t.uses_card !== false, driverId: t.driver_id || null,
    taxiId: t.taxi_id || null, plate: (t.taxi && t.taxi.plate) || "" };
}

export async function driverForPay(driverId) {
  const res = got("driver", await db().from("drivers").select("id, full_name, status").eq("id", driverId).maybeSingle());
  if (res.error) throw new Error("The driver could not be read.");
  return res.data || null;
}

/** His commission in his terms (0.015 = 1.5%), 0 when he has none. */
export async function commissionRateFor(driverId) {
  const res = got("terms", await db().from("driver_terms").select("commission_rate").eq("driver_id", driverId).maybeSingle());
  if (res.error) throw new Error("The driver's terms could not be read.");
  return Number(res.data?.commission_rate || 0);
}

export async function payoutAccountFor(driverId) {
  const res = got("account", await db().from("tc_stripe_accounts").select("account_id, status, livemode").eq("driver_id", driverId).maybeSingle());
  if (res.error) throw new Error("The payout account could not be read.");
  return res.data || null;
}

/**
 * The cab's meter trip this STOP belongs to: the newest hiring of that cab
 * that is still open, or ended in the last 20 minutes (the driver may press
 * END on the tablet before the passenger taps). Null if none.
 */
export async function meterTripForTaxi(taxiId) {
  if (!taxiId) return null;
  const since = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const res = got("trip", await db().from("meter_trips").select("id, driver_id, status, started_at, ended_at, total_cents")
    .eq("taxi_id", taxiId).in("status", ["running", "paused", "ended"]).order("started_at", { ascending: false }).limit(1));
  if (res.error) throw new Error("The meter trip could not be read.");
  const m = (res.data || [])[0];
  if (!m) return null;
  if (m.status === "ended" && (!m.ended_at || m.ended_at < since)) return null;
  return m;
}

const PAY = "*";

export async function paymentByRequest(requestId) {
  const res = got("byRequest", await db().from("tc_card_payments").select(PAY).eq("request_id", requestId).maybeSingle());
  if (res.error) throw new Error("The card payment could not be read.");
  return res.data || null;
}

export async function paymentById(id) {
  const res = got("byId", await db().from("tc_card_payments").select(PAY).eq("id", id).maybeSingle());
  if (res.error) throw new Error("The card payment could not be read.");
  return res.data || null;
}

export async function paymentByIntent(piId) {
  const res = got("byIntent", await db().from("tc_card_payments").select(PAY).eq("payment_intent_id", piId).maybeSingle());
  if (res.error) throw new Error("The card payment could not be read.");   // the webhook answers 500: Stripe sends it again
  return res.data || null;
}

export async function paymentByCharge(chargeId) {
  const res = got("byCharge", await db().from("tc_card_payments").select(PAY).eq("charge_id", chargeId).maybeSingle());
  if (res.error) throw new Error("The card payment could not be read.");
  return res.data || null;
}

/** The open or paid card payment of a meter trip, if any (320: at most one). */
export async function activePaymentForTrip(tripId) {
  const res = got("forTrip", await db().from("tc_card_payments").select(PAY).eq("meter_trip_id", tripId)
    .in("status", ["created", "processing", "succeeded"]).maybeSingle());
  if (res.error) throw new Error("The trip's card payment could not be read.");
  return res.data || null;
}

/** Inserts a new payment row. A clash on the trip (another open payment) or the request id returns { clash }. */
export async function insertPayment(row) {
  const res = got("insert", await db().from("tc_card_payments").insert(row).select(PAY).maybeSingle());
  if (res.error) {
    const msg = String(res.error.message || "");
    if (res.error.code === "23505" || /duplicate key/.test(msg)) return { clash: /one_per_trip/.test(msg) ? "trip" : "request" };
    throw new Error("The card payment could not be saved.");
  }
  return { row: res.data };
}

export async function updatePayment(id, patch) {
  const res = got("update", await db().from("tc_card_payments").update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id).select(PAY).maybeSingle());
  if (res.error) throw new Error("The card payment could not be updated.");
  return res.data;
}

/**
 * Starts sending the driver's share - only one caller at a time (the app's
 * result, the webhook and the daily check can all arrive together): the row
 * moves to 'sending' only if nobody else has. Returns the row, or null when
 * someone else is already sending (or it was sent).
 */
export async function claimTransfer(id) {
  const res = got("claim", await db().from("tc_card_payments")
    .update({ transfer_status: "sending", updated_at: new Date().toISOString() })
    .eq("id", id).eq("status", "succeeded").in("transfer_status", ["none", "failed"]).select(PAY).maybeSingle());
  if (res.error) throw new Error("The card payment could not be updated.");
  return res.data || null;
}

/** For the daily sweep: paid but the share not sent (or a send left half-way); payments left half-way; refunds and disputes to ask about. */
export async function paymentsToSweep(limit = 100) {
  const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recent = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
  const [toSend, stuck, toCheck] = await Promise.all([
    db().from("tc_card_payments").select(PAY).eq("status", "succeeded")
      .or(`transfer_status.in.(none,failed),and(transfer_status.eq.sending,updated_at.lt.${old})`)
      .lt("transfer_attempts", 10).order("succeeded_at", { ascending: true }).limit(limit),
    db().from("tc_card_payments").select(PAY).in("status", ["created", "processing"]).not("payment_intent_id", "is", null)
      .lt("updated_at", old).order("created_at", { ascending: true }).limit(limit),
    db().from("tc_card_payments").select(PAY).eq("status", "succeeded").not("charge_id", "is", null).gt("succeeded_at", recent)
      .order("refund_checked_at", { ascending: true, nullsFirst: true }).limit(limit),
  ]);
  got("sweepSend", toSend); got("sweepStuck", stuck); got("sweepCheck", toCheck);
  return { toSend: toSend.data || [], stuck: stuck.data || [], toCheck: toCheck.data || [] };
}

/**
 * A Stripe event, once. Returns true when it should be handled now (new, or
 * seen before but not finished - Stripe is retrying), false when it was
 * already handled.
 */
export async function claimEvent(event) {
  const ins = await db().from("tc_stripe_events").insert({
    event_id: event.id, type: event.type, livemode: Boolean(event.livemode), object_id: event.data?.object?.id || null,
  });
  if (!ins.error) return true;
  const res = got("event", await db().from("tc_stripe_events").select("handled_at").eq("event_id", event.id).maybeSingle());
  if (res.error || !res.data) return true;   // cannot tell: handling is safe to repeat (idempotent below)
  return !res.data.handled_at;
}

export async function eventHandled(eventId, note) {
  got("eventDone", await db().from("tc_stripe_events").update({ handled_at: new Date().toISOString(), note: note ? String(note).slice(0, 300) : null }).eq("event_id", eventId));
}

/** tc-0016: his S710 card fares, newest first (the driver pages and the TaxiCharg app). */
export async function cardPaymentsForDriver(driverId, limit = 500) {
  const res = got("forDriver", await db().from("tc_card_payments")
    .select("id, created_at, succeeded_at, source, fare_cents, surcharge_cents, amount_cents, commission_cents, driver_share_cents, status, card_brand, card_last4, refunded_cents, disputed, transfer_id, transfer_status, reversed_cents")
    .eq("driver_id", driverId).in("status", ["succeeded", "processing"]).order("created_at", { ascending: false }).limit(limit));
  if (res.error) throw new Error("Your card payments could not be read.");
  return res.data || [];
}

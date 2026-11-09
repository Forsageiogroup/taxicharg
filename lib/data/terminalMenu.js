/**
 * DATA LAYER - the driver's menu on his terminal and takings by QR (tc-0019, migration 362).
 * Everything goes through 362's functions: they decide who may sign in, keep only hashes, and credit a payment
 * from a shift report once ever. Their messages are written for the driver, so they are passed on as they are.
 */
import { db } from "@/lib/supabase";

function fail(where, error) {
  const msg = String(error?.message || error || "");
  if (/does not exist|schema cache|PGRST202/i.test(msg)) {
    console.error(`[terminal menu] ${where}: migration 362 is not on this database`, msg);
    throw Object.assign(new Error("The terminal menu is not switched on yet (TaxiCharg is setting it up)."), { status: 503 });
  }
  if (error?.code === "P0001") throw Object.assign(new Error(msg.slice(0, 300)), { status: 400 });   // raise exception: the driver's words
  console.error(`[terminal menu] ${where}:`, msg);
  throw Object.assign(new Error("TaxiCharg cannot be reached right now. Try again."), { status: 503 });
}

async function rpc(name, args) {
  const { data, error } = await db().rpc(name, args);
  if (error) fail(name, error);
  return data;
}

export const signinState = (keyHash) => rpc("terminal_signin_state", { p_key_hash: keyHash });
export const codePassed = (keyHash, driverId, via) => rpc("terminal_code_passed", { p_key_hash: keyHash, p_driver: driverId, p_via: via });
export const signin = (keyHash, pin, tokenHash) => rpc("terminal_signin", { p_key_hash: keyHash, p_pin: pin, p_token_hash: tokenHash });
export const sessionDriver = (keyHash, tokenHash) => rpc("terminal_session_driver", { p_key_hash: keyHash, p_token_hash: tokenHash });
export const signout = (keyHash, tokenHash) => rpc("terminal_signout", { p_key_hash: keyHash, p_token_hash: tokenHash });
export const setProfile = (driverId, { abn, taxiNumber }, via, by) =>
  rpc("driver_terminal_profile_set", { p_driver: driverId, p_abn: abn ?? null, p_taxi: taxiNumber ?? null, p_via: via, p_by: by || null });
export const setPin = (driverId, pin, via) => rpc("driver_terminal_pin_set", { p_driver: driverId, p_pin: pin, p_via: via });
export const newShiftReport = (keyHash, tokenHash, items, codeHash) =>
  rpc("terminal_shift_report_new", { p_key_hash: keyHash, p_token_hash: tokenHash, p_items: items, p_code_hash: codeHash });
export const scanOpen = ({ text, codeHash, byKind, byDriver, byStaff, byName, method, device }) =>
  rpc("takings_qr_scan_open", { p_text: text, p_code_hash: codeHash, p_by_kind: byKind, p_by_driver: byDriver || null, p_by_staff: byStaff || null,
    p_by_name: byName || null, p_method: method, p_device: device || null });
export const scanClaim = (scanId, ref) => rpc("takings_qr_claim", { p_scan: scanId, p_ref: ref });
export const scanClose = (scanId) => rpc("takings_qr_scan_close", { p_scan: scanId });

/** A scan, for the one who made it (a driver sees only his own). */
export async function scanFor(scanId, driverId) {
  const { data, error } = await db().from("takings_qr_scans")
    .select("id, report_id, by_driver, outcome, items, found, already_in, voided, credited_now, credited_amount, created_at, closed_at")
    .eq("id", scanId).eq("by_driver", driverId).maybeSingle();
  if (error) fail("scan", error);
  return data || null;
}

/** What was credited by a scan (to show "credited now" against the scan's first look). */
export async function claimsForScan(scanId) {
  const { data, error } = await db().from("terminal_payment_claims").select("payment_ref, amount").eq("scan_id", scanId);
  if (error) fail("claims", error);
  return data || [];
}

/** The ABN, taxi number and hold flag the terminal menu shows / checks. */
export async function driverExtras(driverId) {
  const { data, error } = await db().from("drivers").select("abn, receipt_taxi_number, account_hold, status").eq("id", driverId).maybeSingle();
  if (error) fail("driver", error);
  return data ? { abn: data.abn || "", taxiNumber: data.receipt_taxi_number || "", onHold: data.account_hold === true, status: data.status } : null;
}

/** Has he set a terminal PIN? (yes / no only - the hash never leaves the database) */
export async function hasTerminalPin(driverId) {
  const r = await db().from("driver_terminal_pins").select("driver_id, set_at").eq("driver_id", driverId).maybeSingle();
  if (r.error) fail("pin", r.error);
  return r.data ? { set: true, at: r.data.set_at } : { set: false, at: null };
}

/** His card payments taken on this terminal (last 14 days, newest first). */
export async function terminalPayments(terminalId, driverId, provider, { days = 14, limit = 100 } = {}) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  if (provider === "stripe") {
    const { data, error } = await db().from("tc_card_payments")
      .select("payment_intent_id, status, fare_cents, amount_cents, refunded_cents, disputed, transfer_status, card_brand, card_last4, created_at, succeeded_at")
      .eq("terminal_id", terminalId).eq("driver_id", driverId).eq("status", "succeeded").gte("created_at", since)
      .order("created_at", { ascending: false }).limit(limit);
    if (error) fail("payments", error);
    return data || [];
  }
  const { data, error } = await db().from("clover_payments")
    .select("clover_payment_id, paid_at, total, surcharge, refunded, voided, status, card_type, last4, fee_included, fare_before_fee")
    .eq("terminal_id", terminalId).eq("driver_id", driverId).gte("paid_at", since)
    .order("paid_at", { ascending: false }).limit(limit);
  if (error) fail("payments", error);
  return data || [];
}

/** His last shift reports on this terminal. */
export async function shiftReports(terminalId, driverId, limit = 20) {
  const { data, error } = await db().from("terminal_shift_reports")
    .select("number, period_from, period_to, payments, voided, card_total, created_at")
    .eq("terminal_id", terminalId).eq("driver_id", driverId).order("created_at", { ascending: false }).limit(limit);
  if (error) fail("reports", error);
  return data || [];
}

/**
 * tc-0020: what the terminal menu's profile shows beyond the name - his SYD CABS ID, his driver authority's
 * expiry, since when this terminal is his, and the terminal's merchant id (only the last 4 leave the server).
 */
export async function profileExtras(driverId, terminalId) {
  const [d, a, t] = await Promise.all([
    db().from("drivers").select("reference, authority_expires").eq("id", driverId).maybeSingle(),
    db().from("terminal_allocations").select("from_at").eq("terminal_id", terminalId).eq("driver_id", driverId).is("to_at", null).order("from_at", { ascending: false }).limit(1).maybeSingle(),
    db().from("clover_terminals").select("mid").eq("id", terminalId).maybeSingle(),
  ]);
  for (const [w, r] of [["driver", d], ["allocation", a], ["terminal", t]]) if (r.error) fail(w, r.error);
  const mid = String(t.data?.mid || "");
  return {
    reference: d.data?.reference || "",
    authorityExpires: d.data?.authority_expires || null,
    since: a.data?.from_at || null,
    midLast4: mid.length >= 4 ? mid.slice(-4) : "",
  };
}

/** tc-0020: his meter trips (the cab tablet's) ended in a period - for the terminal's Trips and shift report. */
export async function meterTrips(driverId, fromIso, toIso, limit = 200) {
  const { data, error } = await db().from("meter_trips")
    .select("id, started_at, ended_at, hail, job_no, receipt_no, pickup_text, dropoff_text, total_cents, levy_cents, distance_m, payment_method, voided_at, false_job_at")
    .eq("driver_id", driverId).eq("status", "ended").gte("ended_at", fromIso).lt("ended_at", toIso)
    .order("ended_at", { ascending: false }).limit(limit);
  if (error) fail("trips", error);
  return data || [];
}

/**
 * tc-0020 (the owner, 9 Nov: "give the backend option to turn off the job if we do not want to give the jobs on
 * terminal"): may this terminal show and be offered jobs? 363's switch terminal.jobs (fleet, or the cab's own
 * value). Off when the switch is not on this database yet, or anything is unknown - never on by mistake.
 */
export async function jobsOn(keyHash) {
  const { data, error } = await db().rpc("terminal_jobs_on", { p_key_hash: keyHash });
  if (error) {
    if (!/does not exist|schema cache|PGRST202/i.test(String(error.message || ""))) console.error("[terminal menu] jobs:", error.message || error);
    return false;
  }
  return data === true;
}

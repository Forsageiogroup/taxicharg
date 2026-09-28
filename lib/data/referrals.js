/**
 * Refer a friend (28 Sept, migration 131). The offer: give $50, get $50 -
 * the friend joins with the driver's code and takes $2,000 in card fares
 * within 60 days of collecting their terminal; both bonuses land in the
 * TaxiCharg balance. Each row carries its own numbers, so the offer can
 * change later without rewriting history.
 */
import { db } from "@/lib/supabase";

export const OFFER = { bonus: 50, threshold: 2000, windowDays: 60 };

const SITE = (process.env.TC_SITE_URL || "https://taxicharg.com.au").replace(/\/$/, "");
export const shareLink = (code) => `${SITE}/signup?ref=${encodeURIComponent(code)}`;

/** The driver whose code this is, if it is a live Taxi Charge driver's. */
export async function findDriverByReferralCode(code) {
  const c = String(code || "").trim().toUpperCase();
  if (!/^TC-[A-Z2-9]{6}$/.test(c)) return null;
  const { data } = await db().from("drivers").select("id, full_name, reference, status, brand").eq("referral_code", c).maybeSingle();
  if (!data || data.brand !== "taxicharge" || data.status === "suspended") return null;
  return { id: data.id, name: data.full_name, reference: data.reference, code: c };
}

/** A friend signed up with a code: remember it, so the office can link and pay it. */
export async function recordReferral({ referrer, name, email, phone }) {
  const { data, error } = await db().from("tc_referrals").insert({
    code: referrer.code, referrer_driver_id: referrer.id,
    friend_name: name || null, friend_email: String(email).trim().toLowerCase(), friend_phone: phone || null,
    bonus_amount: OFFER.bonus, threshold_amount: OFFER.threshold, window_days: OFFER.windowDays,
  }).select("id").single();
  if (error) {
    // the same friend twice is not an error worth showing the friend
    if (!/idx_tc_referrals_friend_once|duplicate/i.test(error.message)) console.error("[referral] record", error.message);
    return null;
  }
  return data;
}

/** What this driver has referred, with where each one stands (the view works it out). */
export async function listReferralsForDriver(driverId) {
  const { data, error } = await db().from("tc_referrals_status")
    .select("id, code, stage, created_at, linked_at, paid_at, friend_name, referee_name, bonus_amount, threshold_amount, window_days, fares_in_window, window_ends_at")
    .eq("referrer_driver_id", driverId).order("created_at", { ascending: false }).limit(100);
  if (error) { console.error("[referral] list", error.message); return []; }
  return (data || []).map((r) => ({
    id: r.id, stage: r.stage, createdAt: r.created_at, linkedAt: r.linked_at, paidAt: r.paid_at,
    name: r.referee_name || r.friend_name || "A friend",
    bonus: Number(r.bonus_amount), threshold: Number(r.threshold_amount), windowDays: r.window_days,
    fares: Number(r.fares_in_window || 0), windowEndsAt: r.window_ends_at,
  }));
}

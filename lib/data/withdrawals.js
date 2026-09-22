/**
 * DATA LAYER — withdrawals (payout_requests on the shared back end)
 * A "Withdraw funds" request is a row the office sees in the SYD CABS
 * panel's Driver payments queue; when Accounts pays it, the payout is a
 * wallet entry and the request is marked paid. Statuses shown here:
 * processing (requested), paid, declined, cancelled.
 */

import { db } from "@/lib/supabase";

function status(s) { return s === "requested" ? "processing" : s; }

export async function listWithdrawalsForDriver(driverId, { limit = 20 } = {}) {
  let q = db().from("payout_requests").select("id, driver_id, requested_at, amount, status, method, decided_at, reason").eq("driver_id", driverId).order("requested_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data } = await q;
  return (data || []).map((r) => ({ id: r.id, driverId: r.driver_id, date: new Date(r.requested_at).toISOString(), amount: Number(r.amount), status: status(r.status), method: r.method, reason: r.reason || null }));
}

export async function recordWithdrawal(driverId, { amount, status: _s = "processing", method = "Bank transfer" }) {
  const { data, error } = await db().from("payout_requests").insert({ driver_id: driverId, amount: Math.round(Number(amount) * 100) / 100, method, source: "taxicharge" })
    .select("id, driver_id, requested_at, amount, status, method").single();
  if (error) throw new Error(error.message);
  return { id: data.id, driverId: data.driver_id, date: new Date(data.requested_at).toISOString(), amount: Number(data.amount), status: status(data.status), method: data.method };
}

/** What is still waiting to be paid - held back from the available balance. */
export async function pendingWithdrawalTotal(driverId) {
  const { data } = await db().from("payout_requests").select("amount").eq("driver_id", driverId).eq("status", "requested");
  return Math.round((data || []).reduce((a, r) => a + Number(r.amount), 0) * 100) / 100;
}

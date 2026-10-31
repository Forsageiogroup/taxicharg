/**
 * DATA LAYER — reports (the shared back end)
 * Aggregates the real ledger (lib/data/payments.js) into weekly buckets,
 * period metrics and settlements. Same shapes as before.
 */

import { listPaymentsForDriver, isMoneyStatus } from "./payments";
import { db } from "@/lib/supabase";
import { sydneyWeekStart, sydneyDay } from "@/lib/time/sydney";
import { summarise, inSydneyRange, round2 } from "@/lib/money/report";

// tc-0014: the week a fare belongs to starts on a Sydney Monday (the server runs in UTC)
function isoWeekLabel(date) {
  return sydneyWeekStart(date);
}

export async function getWeeklyReport(driverId) {
  const rows = (await listPaymentsForDriver(driverId, { limit: 0 })).filter((r) => isMoneyStatus(r.status));
  const buckets = new Map();
  for (const r of rows) {
    const key = isoWeekLabel(r.date);
    if (!buckets.has(key)) buckets.set(key, { weekStarting: key, trips: 0, fares: 0, tips: 0, fees: 0, total: 0 });
    const b = buckets.get(key);
    b.trips += r.transactions || 0; b.fares += r.fare; b.tips += r.tip; b.fees += r.fee; b.total += r.total;
  }
  return Array.from(buckets.values()).map((b) => ({ ...b, fares: round2(b.fares), tips: round2(b.tips), fees: round2(b.fees), total: round2(b.total) }))
    .sort((a, b) => (a.weekStarting < b.weekStarting ? 1 : -1)).slice(0, 12);
}

export async function getMethodBreakdown(driverId) {
  const rows = (await listPaymentsForDriver(driverId, { limit: 0 })).filter((r) => isMoneyStatus(r.status));
  const byMethod = new Map();
  for (const r of rows) byMethod.set(r.method, (byMethod.get(r.method) || 0) + r.total);
  return Array.from(byMethod.entries()).map(([method, total]) => ({ method, total: round2(total) }));
}

// tc-0014: From and To are Sydney days (they were UTC days on the server)
export async function getPeriodMetrics(driverId, { from, to }) {
  const rows = (await listPaymentsForDriver(driverId, { limit: 0 })).filter((r) => isMoneyStatus(r.status));
  return summarise(inSydneyRange(rows, from, to));
}

/** tc-0014: what was paid out to him in the period (Sydney days), from his settlements. */
export async function getPaidOut(driverId, { from, to }) {
  const rows = await getSettlements(driverId, { limit: 500 });
  return round2(rows.filter((r) => r.status === "paid" && r.date >= from && r.date <= to).reduce((a, r) => a + Number(r.amount || 0), 0));
}

const PERIODS = { month: 30, "30d": 30, year: 365 };

export async function getOverviewMetrics(driverId, period = "month") {
  const rows = (await listPaymentsForDriver(driverId, { limit: 0 })).filter((r) => isMoneyStatus(r.status));
  const days = PERIODS[period] || 30, now = new Date();
  const currentStart = new Date(now); currentStart.setDate(currentStart.getDate() - days);
  const previousStart = new Date(currentStart); previousStart.setDate(previousStart.getDate() - days);
  const current = summarise(rows.filter((r) => new Date(r.date) >= currentStart && new Date(r.date) <= now));
  const previous = summarise(rows.filter((r) => new Date(r.date) >= previousStart && new Date(r.date) < currentStart));
  const pct = (c, p) => (!p ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 1000) / 10);
  return { faceValue: current.faceValue, commission: current.commission, transactions: current.transactions,
    faceValueChangePct: pct(current.faceValue, previous.faceValue), commissionChangePct: pct(current.commission, previous.commission), transactionsChangePct: pct(current.transactions, previous.transactions) };
}

/**
 * Settlements: the money that actually went to the person.
 * tc-0013: for a TaxiCharg terminal user (role 'terminal') every payout the
 * office made from his wallet (it is all TaxiCharg Clover money), plus what
 * is requested and not yet paid. For anyone else only the Clover cash-outs
 * he asked for on THIS site - never a SYD CABS payout.
 */
export async function getSettlements(driverId, { limit = 20 } = {}) {
  const who = await db().from("drivers").select("role").eq("id", driverId).maybeSingle();
  const terminalUser = who.data && who.data.role === "terminal";
  if (!terminalUser) {
    const { data } = await db().from("payout_requests").select("id, requested_at, decided_at, amount, method, status").eq("driver_id", driverId).eq("source", "taxicharge").in("status", ["requested", "paid"]).order("requested_at", { ascending: false }).limit(limit || 100);
    return (data || []).map((r) => ({ date: sydneyDay(r.status === "paid" ? (r.decided_at || r.requested_at) : r.requested_at), transactions: 1, amount: round2(r.amount), refunds: 0, status: r.status === "paid" ? "paid" : "pending", method: r.method || "Bank transfer" }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  const [paid, waiting] = await Promise.all([
    db().from("driver_wallet_entries").select("id, entry_at, amount, method, reference, note, reverses_id").eq("driver_id", driverId).eq("kind", "payout").is("reverses_id", null).order("entry_at", { ascending: false }).limit(limit || 100),
    db().from("payout_requests").select("id, requested_at, amount, method").eq("driver_id", driverId).eq("status", "requested").order("requested_at", { ascending: false }),
  ]);
  const rows = (waiting.data || []).map((r) => ({ date: sydneyDay(r.requested_at), transactions: 1, amount: round2(r.amount), refunds: 0, status: "pending", method: r.method }))
    .concat((paid.data || []).map((r) => ({ date: sydneyDay(r.entry_at), transactions: 1, amount: round2(r.amount), refunds: 0, status: "paid", method: r.method || "Bank transfer", reference: r.reference || null })));
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit || rows.length);
}

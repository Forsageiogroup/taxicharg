/**
 * DATA LAYER — reports (the shared back end)
 * Aggregates the real ledger (lib/data/payments.js) into weekly buckets,
 * period metrics and settlements. Same shapes as before.
 */

import { listPaymentsForDriver, isMoneyStatus } from "./payments";
import { db } from "@/lib/supabase";

function round2(n) { return Math.round(Number(n || 0) * 100) / 100; }

function isoWeekLabel(date) {
  const d = new Date(date), day = d.getDay(), monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
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

function summarise(rows) {
  const faceValue = round2(rows.reduce((a, r) => a + r.total, 0));
  const commission = round2(rows.reduce((a, r) => a + r.commission, 0));
  const feesPaid = round2(rows.reduce((a, r) => a + r.fee, 0));
  const refunds = round2(rows.reduce((a, r) => a + r.refundAmount, 0));
  const settledRows = rows.filter((r) => r.status === "settled" && !r.refunded);
  const amountSettled = round2(settledRows.reduce((a, r) => a + r.total, 0));
  return { faceValue, commission, transactions: rows.reduce((a, r) => a + (r.transactions || 0), 0) || rows.length, feesPaid, refunds, totalFeesAndRefunds: round2(feesPaid + refunds), amountSettled };
}

export async function getPeriodMetrics(driverId, { from, to }) {
  const rows = (await listPaymentsForDriver(driverId, { limit: 0 })).filter((r) => isMoneyStatus(r.status));
  const fromDate = new Date(`${from}T00:00:00`), toDate = new Date(`${to}T23:59:59.999`);
  return summarise(rows.filter((r) => { const d = new Date(r.date); return d >= fromDate && d <= toDate; }));
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
 * Settlements: the money that actually went to the person - every payout
 * the office made from the wallet (bank or cash), plus what is requested
 * and not yet paid, shown as pending.
 */
export async function getSettlements(driverId, { limit = 20 } = {}) {
  const [paid, waiting] = await Promise.all([
    db().from("driver_wallet_entries").select("id, entry_at, amount, method, reference, note, reverses_id").eq("driver_id", driverId).eq("kind", "payout").is("reverses_id", null).order("entry_at", { ascending: false }).limit(limit || 100),
    db().from("payout_requests").select("id, requested_at, amount, method").eq("driver_id", driverId).eq("status", "requested").order("requested_at", { ascending: false }),
  ]);
  const rows = (waiting.data || []).map((r) => ({ date: String(r.requested_at).slice(0, 10), transactions: 1, amount: round2(r.amount), refunds: 0, status: "pending", method: r.method }))
    .concat((paid.data || []).map((r) => ({ date: String(r.entry_at).slice(0, 10), transactions: 1, amount: round2(r.amount), refunds: 0, status: "paid", method: r.method || "Bank transfer", reference: r.reference || null })));
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, limit || rows.length);
}

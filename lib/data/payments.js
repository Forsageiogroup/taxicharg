/**
 * DATA LAYER — payments (the shared back end)
 * -------------------------------------------------------------------
 * The "transactions" a Taxi Charge user sees are the real records the
 * office keeps: each takings report (a Clover report the person sent, or
 * the office entered, verified against the Clover dashboard, then settled)
 * and any takings the office posted to the wallet directly. Same row shape
 * the pages have always used, so nothing above this file changes:
 *   { id, driverId, date, fare, tip, total, method, card, status, reason,
 *     voidReason, fee, commission, refunded, refundAmount, transactions }
 * status: settled | pending | failed (a rejected report, with the reason)
 * -------------------------------------------------------------------
 */

import { db } from "@/lib/supabase";
import { pendingWithdrawalTotal } from "./withdrawals";

export function isMoneyStatus(status) {
  return status !== "failed" && status !== "voided";
}

function round2(n) { return Math.round(Number(n || 0) * 100) / 100; }

const cache = new Map();   // per request burst: the same ledger is asked for several times per page

export async function listPaymentsForDriver(driverId, { limit = 50 } = {}) {
  const key = driverId;
  if (!cache.has(key) || Date.now() - cache.get(key).at > 5000) {
    const [reports, entries] = await Promise.all([
      db().from("takings_reports").select("id, period_from, period_to, card_total, verified_total, transactions, status, reject_reason, settled_at, verified_at, submitted_at, terminal:terminal_id(serial, label)").eq("driver_id", driverId).order("period_to", { ascending: false }).limit(500),
      db().from("driver_wallet_entries").select("id, entry_at, amount, kind, direction, method, reference, note, report_id, reverses_id").eq("driver_id", driverId).in("kind", ["takings", "commission", "platform_fee", "refund"]).order("entry_at", { ascending: false }).limit(1000),
    ]);
    const rows = [];
    for (const r of reports.data || []) {
      const total = round2(r.verified_total != null ? r.verified_total : r.card_total);
      rows.push({
        id: r.id, driverId, date: new Date((r.settled_at || r.verified_at || (r.period_to + "T17:00:00")) ).toISOString(),
        fare: total, tip: 0, total, method: "EFTPOS", card: null,
        status: r.status === "settled" ? "settled" : r.status === "rejected" ? "failed" : "pending",
        reason: r.status === "rejected" ? (r.reject_reason || "Report not accepted") : null, voidReason: null,
        fee: 0, commission: 0, refunded: false, refundAmount: 0,
        transactions: r.transactions || null, period: { from: r.period_from, to: r.period_to }, terminal: r.terminal ? (r.terminal.label || r.terminal.serial) : null,
        kind: "report",
      });
    }
    // takings the office posted straight to the wallet (not through a report); fees and refunds ride on the nearest report as fee/refund figures
    const reported = new Set(rows.map((x) => x.id));
    for (const e of entries.data || []) {
      if (e.reverses_id) continue;
      if (e.kind === "takings" && !(e.report_id && reported.has(e.report_id))) {
        rows.push({ id: e.id, driverId, date: new Date(e.entry_at).toISOString(), fare: round2(e.amount), tip: 0, total: round2(e.amount), method: e.method === "cash" ? "Cash" : "EFTPOS", card: null,
          status: "settled", reason: null, voidReason: null, fee: 0, commission: 0, refunded: false, refundAmount: 0, transactions: null, note: e.note || null, kind: "takings" });
      } else if (e.kind === "platform_fee" || e.kind === "refund") {
        const host = e.report_id && rows.find((x) => x.id === e.report_id);
        if (host) { if (e.kind === "platform_fee") host.fee = round2(host.fee + Number(e.amount)); else { host.refunded = true; host.refundAmount = round2(host.refundAmount + Number(e.amount)); } }
        else rows.push({ id: e.id, driverId, date: new Date(e.entry_at).toISOString(), fare: 0, tip: 0, total: 0, method: "EFTPOS", card: null, status: "settled", reason: null, voidReason: null,
          fee: e.kind === "platform_fee" ? round2(e.amount) : 0, commission: 0, refunded: e.kind === "refund", refundAmount: e.kind === "refund" ? round2(e.amount) : 0, transactions: null, note: e.note || null, kind: e.kind });
      }
    }
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    cache.set(key, { at: Date.now(), rows });
  }
  const rows = cache.get(key).rows;
  return limit ? rows.slice(0, limit) : rows;
}

function sum(rows, key = "total") { return round2(rows.reduce((acc, r) => acc + (r[key] || 0), 0)); }

export async function getDriverSummary(driverId) {
  const [rows, bal, pendingOut] = await Promise.all([
    listPaymentsForDriver(driverId, { limit: 0 }),
    db().from("driver_wallet_balance").select("balance").eq("driver_id", driverId).maybeSingle(),
    pendingWithdrawalTotal(driverId),
  ]);
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));   // Monday
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const money = rows.filter((r) => isMoneyStatus(r.status));
  const todayRows = money.filter((r) => new Date(r.date) >= startOfToday);
  const weekRows = money.filter((r) => new Date(r.date) >= startOfWeek);
  const monthRows = money.filter((r) => new Date(r.date) >= startOfMonth);
  const pendingRows = money.filter((r) => r.status === "pending");
  const balance = round2((bal.data && bal.data.balance) || 0);
  return {
    todayTotal: sum(todayRows), todayTrips: todayRows.reduce((a, r) => a + (r.transactions || 0), 0),
    weekTotal: sum(weekRows), weekTrips: weekRows.reduce((a, r) => a + (r.transactions || 0), 0),
    monthTotal: sum(monthRows), monthTrips: monthRows.reduce((a, r) => a + (r.transactions || 0), 0),
    pendingPayout: round2(sum(pendingRows) + pendingOut),
    availableBalance: Math.max(0, round2(balance - pendingOut)),   // the wallet, less what is already asked for
    balance,
    pendingWithdrawals: pendingOut,
    totalFeesThisMonth: sum(monthRows, "fee"),
  };
}

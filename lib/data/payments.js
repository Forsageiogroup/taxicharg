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
import { pendingWithdrawalTotal, taxichargeRequestTotals } from "./withdrawals";
import { cloverMoney, cloverPaymentRows } from "@/lib/money/clover";

export function isMoneyStatus(status) {
  return status !== "failed" && status !== "voided";
}

function round2(n) { return Math.round(Number(n || 0) * 100) / 100; }

const cache = new Map();   // per request burst: the same ledger is asked for several times per page

/**
 * tc-0013: the Clover side only. A TaxiCharg terminal user (role 'terminal')
 * keeps everything he had (his wallet is all TaxiCharg Clover money); for
 * anyone else only the Clover lines (source 'clover') and Clover takings
 * reports count - never a SYD CABS job, charge or fee.
 */
async function ledger(driverId) {
  const hit = cache.get(driverId);
  if (hit && Date.now() - hit.at < 5000) return hit;
  const [who, reports, cloverLines, reportLines, oldLines] = await Promise.all([
    db().from("drivers").select("role").eq("id", driverId).maybeSingle(),
    db().from("takings_reports").select("id, period_from, period_to, card_total, verified_total, transactions, status, reject_reason, settled_at, verified_at, submitted_at, terminal:terminal_id(serial, label)").eq("driver_id", driverId).order("period_to", { ascending: false }).limit(500),
    db().from("driver_wallet_entries").select("id, entry_at, amount, kind, direction, method, reference, note, external_ref, reverses_id").eq("driver_id", driverId).eq("source", "clover").order("entry_at", { ascending: false }).limit(5000),
    db().from("driver_wallet_entries").select("id, entry_at, amount, kind, direction, method, reference, note, report_id, reverses_id, source").eq("driver_id", driverId).not("report_id", "is", null).neq("source", "clover").limit(5000),
    db().from("driver_wallet_entries").select("id, entry_at, amount, kind, direction, method, reference, note, report_id, reverses_id, source").eq("driver_id", driverId).neq("source", "clover").in("kind", ["takings", "commission", "platform_fee", "refund"]).order("entry_at", { ascending: false }).limit(1000),
  ]);
  const role = (who.data && who.data.role) || null;
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
  // fees and refunds of a report ride on that report
  const reported = new Set(rows.map((x) => x.id));
  // a terminal user also keeps what the office posted for him by hand (it is all TaxiCharg Clover money)
  const handLines = role === "terminal" ? (oldLines.data || []) : (oldLines.data || []).filter((e) => e.report_id);
  for (const e of handLines) {
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
  // every Clover card sale, one row each, with its Service fee, commission, void and refunds
  rows.push(...cloverPaymentRows(cloverLines.data || [], driverId));
  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  const out = { at: Date.now(), role, rows, cloverLines: cloverLines.data || [], reportLines: reportLines.data || [] };
  cache.set(driverId, out);
  return out;
}

export async function listPaymentsForDriver(driverId, { limit = 50 } = {}) {
  const { rows } = await ledger(driverId);
  return limit ? rows.slice(0, limit) : rows;
}

function sum(rows, key = "total") { return round2(rows.reduce((acc, r) => acc + (r[key] || 0), 0)); }

export async function getDriverSummary(driverId) {
  const [book, bal, pendingAll, here] = await Promise.all([
    ledger(driverId),
    db().from("driver_wallet_balance").select("balance").eq("driver_id", driverId).maybeSingle(),
    pendingWithdrawalTotal(driverId),
    taxichargeRequestTotals(driverId),
  ]);
  const rows = book.rows;
  const clover = cloverMoney({
    role: book.role, walletBalance: (bal.data && bal.data.balance) || 0,
    cloverLines: book.cloverLines, reportLines: book.reportLines,
    paidHere: here.paid, pendingHere: here.requested, pendingAll,
  });
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));   // Monday
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const money = rows.filter((r) => isMoneyStatus(r.status));
  const todayRows = money.filter((r) => new Date(r.date) >= startOfToday);
  const weekRows = money.filter((r) => new Date(r.date) >= startOfWeek);
  const monthRows = money.filter((r) => new Date(r.date) >= startOfMonth);
  const pendingRows = money.filter((r) => r.status === "pending");
  return {
    todayTotal: sum(todayRows), todayTrips: todayRows.reduce((a, r) => a + (r.transactions || 0), 0),
    weekTotal: sum(weekRows), weekTrips: weekRows.reduce((a, r) => a + (r.transactions || 0), 0),
    monthTotal: sum(monthRows), monthTrips: monthRows.reduce((a, r) => a + (r.transactions || 0), 0),
    pendingPayout: round2(sum(pendingRows) + clover.pendingWithdrawals),
    availableBalance: clover.available,   // Clover money only, less what is already asked for (tc-0013)
    balance: clover.balance,
    pendingWithdrawals: clover.pendingWithdrawals,
    totalFeesThisMonth: sum(monthRows, "fee"),
  };
}

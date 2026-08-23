import { listPaymentsForDriver } from "./payments";

/**
 * MOCK DATA LAYER — reports
 * Aggregates the payments ledger into weekly buckets for charts/tables.
 */

function isoWeekLabel(date) {
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export async function getWeeklyReport(driverId) {
  const rows = await listPaymentsForDriver(driverId, { limit: 0 });
  const buckets = new Map();

  for (const r of rows) {
    const key = isoWeekLabel(r.date);
    if (!buckets.has(key)) {
      buckets.set(key, { weekStarting: key, trips: 0, fares: 0, tips: 0, fees: 0, total: 0 });
    }
    const b = buckets.get(key);
    b.trips += 1;
    b.fares += r.fare;
    b.tips += r.tip;
    b.fees += r.fee;
    b.total += r.total;
  }

  return Array.from(buckets.values())
    .map((b) => ({
      ...b,
      fares: Math.round(b.fares * 100) / 100,
      tips: Math.round(b.tips * 100) / 100,
      fees: Math.round(b.fees * 100) / 100,
      total: Math.round(b.total * 100) / 100,
    }))
    .sort((a, b) => (a.weekStarting < b.weekStarting ? 1 : -1))
    .slice(0, 12);
}

export async function getMethodBreakdown(driverId) {
  const rows = await listPaymentsForDriver(driverId, { limit: 0 });
  const byMethod = new Map();
  for (const r of rows) {
    byMethod.set(r.method, (byMethod.get(r.method) || 0) + r.total);
  }
  return Array.from(byMethod.entries()).map(([method, total]) => ({
    method,
    total: Math.round(total * 100) / 100,
  }));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function summarise(rows) {
  const faceValue = round2(rows.reduce((a, r) => a + r.total, 0));
  const commission = round2(rows.reduce((a, r) => a + r.commission, 0));
  const feesPaid = round2(rows.reduce((a, r) => a + r.fee, 0));
  const refunds = round2(rows.reduce((a, r) => a + r.refundAmount, 0));
  const settledRows = rows.filter((r) => r.status === "settled" && !r.refunded);
  const amountSettled = round2(settledRows.reduce((a, r) => a + r.total, 0));
  return {
    faceValue,
    commission,
    transactions: rows.length,
    feesPaid,
    refunds,
    totalFeesAndRefunds: round2(feesPaid + refunds),
    amountSettled,
  };
}

/** Key metrics for the Reports page over an arbitrary [from, to] date range (inclusive). */
export async function getPeriodMetrics(driverId, { from, to }) {
  const rows = await listPaymentsForDriver(driverId, { limit: 0 });
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T23:59:59.999`);
  const inRange = rows.filter((r) => {
    const d = new Date(r.date);
    return d >= fromDate && d <= toDate;
  });
  return summarise(inRange);
}

const PERIODS = {
  month: 30,
  "30d": 30,
  year: 365,
};

/** Current-vs-previous period comparison for the Overview page's key metrics. */
export async function getOverviewMetrics(driverId, period = "month") {
  const rows = await listPaymentsForDriver(driverId, { limit: 0 });
  const days = PERIODS[period] || 30;
  const now = new Date();

  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - days);
  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - days);

  const currentRows = rows.filter((r) => new Date(r.date) >= currentStart && new Date(r.date) <= now);
  const previousRows = rows.filter((r) => new Date(r.date) >= previousStart && new Date(r.date) < currentStart);

  const current = summarise(currentRows);
  const previous = summarise(previousRows);

  function pctChange(curr, prev) {
    if (!prev) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  }

  return {
    faceValue: current.faceValue,
    commission: current.commission,
    transactions: current.transactions,
    faceValueChangePct: pctChange(current.faceValue, previous.faceValue),
    commissionChangePct: pctChange(current.commission, previous.commission),
    transactionsChangePct: pctChange(current.transactions, previous.transactions),
  };
}

/**
 * Groups settled transactions into daily settlement batches — i.e. "this
 * is the money that hit your account on this date," distinct from the
 * raw per-trip transaction list.
 */
export async function getSettlements(driverId, { limit = 20 } = {}) {
  const rows = await listPaymentsForDriver(driverId, { limit: 0 });
  const buckets = new Map();

  for (const r of rows) {
    if (r.status !== "settled") continue;
    const day = r.date.slice(0, 10);
    if (!buckets.has(day)) buckets.set(day, { date: day, transactions: 0, amount: 0, refunds: 0 });
    const b = buckets.get(day);
    b.transactions += 1;
    b.amount += r.refunded ? 0 : r.total;
    b.refunds += r.refundAmount;
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  return Array.from(buckets.values())
    .map((b) => ({
      ...b,
      amount: round2(b.amount),
      refunds: round2(b.refunds),
      status: b.date === today || b.date === yesterday ? "pending" : "paid",
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

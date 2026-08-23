import { listPaymentsForDriver, isMoneyStatus } from "./payments";
import { listDrivers } from "./drivers";

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
  const rows = (await listPaymentsForDriver(driverId, { limit: 0 })).filter((r) => isMoneyStatus(r.status));
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
  const rows = (await listPaymentsForDriver(driverId, { limit: 0 })).filter((r) => isMoneyStatus(r.status));
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
  const rows = (await listPaymentsForDriver(driverId, { limit: 0 })).filter((r) => isMoneyStatus(r.status));
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
  const rows = (await listPaymentsForDriver(driverId, { limit: 0 })).filter((r) => isMoneyStatus(r.status));
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

/* -------------------------------------------------------------------
 * FLEET-WIDE (admin) aggregates — same numbers, rolled up across every
 * driver instead of one. `commission` on each transaction is TaxiCharg's
 * cut; "drivers" below always means gross minus that same commission,
 * so these figures reconcile exactly with each driver's own Reports tab.
 * ---------------------------------------------------------------- */

async function getAllTransactions() {
  const drivers = await listDrivers();
  const nameById = new Map(drivers.map((d) => [d.id, d.name]));
  const rowsPerDriver = await Promise.all(
    drivers.map((d) => listPaymentsForDriver(d.id, { limit: 0 }))
  );
  return rowsPerDriver
    .flat()
    .map((r) => ({ ...r, driverName: nameById.get(r.driverId) || r.driverId }));
}

function summariseFleet(allRows) {
  const rows = allRows.filter((r) => isMoneyStatus(r.status));
  const trips = rows.length;
  const gross = round2(rows.reduce((a, r) => a + r.total, 0));
  const company = round2(rows.reduce((a, r) => a + r.commission, 0));
  const drivers = round2(gross - company);
  return { trips, gross, drivers, company };
}

function fleetPctChange(curr, prev) {
  if (!prev) return curr > 0 ? null : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

/** Today / last 7 days / last 30 days, each compared to the equivalent prior window. */
export async function getFleetOverview() {
  const rows = await getAllTransactions();
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 7);
  const startPrev7 = new Date(start7);
  startPrev7.setDate(startPrev7.getDate() - 7);

  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);
  const startPrev30 = new Date(start30);
  startPrev30.setDate(startPrev30.getDate() - 30);

  const inRange = (r, from, to) => {
    const d = new Date(r.date);
    return d >= from && d < to;
  };

  const today = summariseFleet(rows.filter((r) => inRange(r, startOfToday, now)));
  const yesterday = summariseFleet(rows.filter((r) => inRange(r, startOfYesterday, startOfToday)));
  const last7 = summariseFleet(rows.filter((r) => inRange(r, start7, now)));
  const prev7 = summariseFleet(rows.filter((r) => inRange(r, startPrev7, start7)));
  const last30 = summariseFleet(rows.filter((r) => inRange(r, start30, now)));
  const prev30 = summariseFleet(rows.filter((r) => inRange(r, startPrev30, start30)));

  return {
    today: { ...today, changePct: fleetPctChange(today.gross, yesterday.gross) },
    last7: { ...last7, changePct: fleetPctChange(last7.gross, prev7.gross) },
    last30: { ...last30, changePct: fleetPctChange(last30.gross, prev30.gross) },
  };
}

/** Daily gross/drivers/company totals across the fleet for the revenue chart. */
export async function getFleetRevenueSeries(days = 14) {
  const rows = (await getAllTransactions()).filter((r) => isMoneyStatus(r.status));
  const now = new Date();
  const buckets = new Map();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, gross: 0, company: 0 });
  }

  for (const r of rows) {
    const key = r.date.slice(0, 10);
    if (!buckets.has(key)) continue;
    const b = buckets.get(key);
    b.gross += r.total;
    b.company += r.commission;
  }

  return Array.from(buckets.values()).map((b) => ({
    date: b.date,
    gross: round2(b.gross),
    company: round2(b.company),
    drivers: round2(b.gross - b.company),
  }));
}

/** Most recent transactions across every driver, for a live activity feed. */
export async function getLivePayments(limit = 8) {
  const rows = await getAllTransactions();
  return rows
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      driverId: r.driverId,
      driverName: r.driverName,
      method: r.method,
      total: r.total,
      date: r.date,
    }));
}

/** Per-driver rollup over the last 7 days, with a 7-point daily series for a sparkline. */
export async function getDriversLast7Days() {
  const drivers = await listDrivers();
  const now = new Date();
  const start7 = new Date(now);
  start7.setDate(start7.getDate() - 7);

  const results = await Promise.all(
    drivers.map(async (d) => {
      const rows = await listPaymentsForDriver(d.id, { limit: 0 });
      const inWindow = rows.filter((r) => new Date(r.date) >= start7);

      const daily = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(day.getDate() - i);
        day.setHours(0, 0, 0, 0);
        const key = day.toISOString().slice(0, 10);
        const dayTotal = inWindow
          .filter((r) => r.date.slice(0, 10) === key && isMoneyStatus(r.status))
          .reduce((a, r) => a + r.total, 0);
        daily.push(round2(dayTotal));
      }

      const summary = summariseFleet(inWindow);
      return {
        id: d.id,
        name: d.name,
        plate: d.plate,
        status: d.status,
        trips: summary.trips,
        driverEarnings: summary.drivers,
        company: summary.company,
        daily,
      };
    })
  );

  return results.sort((a, b) => b.trips - a.trips);
}

/** Daily fleet totals for the reconciliation table — lay this beside Clover's own dashboard. */
export async function getFleetReconciliation({ days = 14 } = {}) {
  const rows = (await getAllTransactions()).filter((r) => isMoneyStatus(r.status));
  const now = new Date();
  const buckets = new Map();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { date: key, trips: 0, fares: 0, tips: 0, gross: 0, company: 0 });
  }

  for (const r of rows) {
    const key = r.date.slice(0, 10);
    if (!buckets.has(key)) continue;
    const b = buckets.get(key);
    b.trips += 1;
    b.fares += r.fare;
    b.tips += r.tip;
    b.gross += r.total;
    b.company += r.commission;
  }

  return Array.from(buckets.values())
    .map((b) => ({
      date: b.date,
      trips: b.trips,
      fares: round2(b.fares),
      tips: round2(b.tips),
      gross: round2(b.gross),
      company: round2(b.company),
      drivers: round2(b.gross - b.company),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

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

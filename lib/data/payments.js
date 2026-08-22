/**
 * MOCK DATA LAYER — payments / transactions
 * Deterministic pseudo-random ledger per driver so the dashboard has
 * realistic numbers without a database. Swap `generateLedger` for a real
 * query (e.g. `SELECT * FROM transactions WHERE driver_id = ...`) when
 * you connect a database — keep the same return shape.
 */

const METHODS = ["EFTPOS (Clover)", "Card (Stripe)", "Cash", "Apple Pay"];
const STATUSES = ["settled", "settled", "settled", "pending"];

// Simple deterministic PRNG (mulberry32) so numbers are stable per driver.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

const ledgerCache = new Map();

function generateLedger(driverId, days = 60) {
  if (ledgerCache.has(driverId)) return ledgerCache.get(driverId);

  const rand = mulberry32(seedFromId(driverId));
  const now = new Date();
  const rows = [];
  let idCounter = 1;

  for (let d = days; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    date.setHours(0, 0, 0, 0);

    const tripsToday = Math.floor(rand() * 9) + 3; // 3-11 trips/day
    for (let t = 0; t < tripsToday; t++) {
      const fare = Math.round((15 + rand() * 60) * 100) / 100;
      const tip = rand() > 0.6 ? Math.round(rand() * 8 * 100) / 100 : 0;
      const method = METHODS[Math.floor(rand() * METHODS.length)];
      const status = d === 0 ? "pending" : STATUSES[Math.floor(rand() * STATUSES.length)];
      const txTime = new Date(date);
      txTime.setHours(6 + Math.floor(rand() * 16), Math.floor(rand() * 60));

      rows.push({
        id: `txn_${driverId}_${idCounter++}`,
        driverId,
        date: txTime.toISOString(),
        fare,
        tip,
        total: Math.round((fare + tip) * 100) / 100,
        method,
        status,
        fee: Math.round(fare * 0.019 * 100) / 100,
      });
    }
  }

  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  ledgerCache.set(driverId, rows);
  return rows;
}

export async function listPaymentsForDriver(driverId, { limit = 50 } = {}) {
  const rows = generateLedger(driverId);
  return limit ? rows.slice(0, limit) : rows;
}

function sum(rows, key = "total") {
  return Math.round(rows.reduce((acc, r) => acc + r[key], 0) * 100) / 100;
}

export async function getDriverSummary(driverId) {
  const rows = generateLedger(driverId);
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayRows = rows.filter((r) => new Date(r.date) >= startOfToday);
  const weekRows = rows.filter((r) => new Date(r.date) >= startOfWeek);
  const monthRows = rows.filter((r) => new Date(r.date) >= startOfMonth);
  const pendingRows = rows.filter((r) => r.status === "pending");
  const settledRows = rows.filter((r) => r.status === "settled");

  return {
    todayTotal: sum(todayRows),
    todayTrips: todayRows.length,
    weekTotal: sum(weekRows),
    weekTrips: weekRows.length,
    monthTotal: sum(monthRows),
    monthTrips: monthRows.length,
    pendingPayout: sum(pendingRows),
    availableBalance: sum(settledRows.slice(0, 30)) * 0.15, // illustrative "available now" figure
    totalFeesThisMonth: sum(monthRows, "fee"),
  };
}

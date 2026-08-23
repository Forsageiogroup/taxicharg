/**
 * MOCK DATA LAYER — withdrawal history
 * Deterministic per driver, same pattern as payments.js. Swap for a real
 * `SELECT * FROM withdrawals WHERE driver_id = ...` once a database is
 * connected — keep the same return shape.
 */

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

const cache = new Map();

function generateHistory(driverId) {
  if (cache.has(driverId)) return cache.get(driverId);

  const rand = mulberry32(seedFromId(driverId) ^ 0x51a1);
  const now = new Date();
  const rows = [];
  let idCounter = 1;

  for (let d = 0; d < 45; d += Math.max(1, Math.floor(rand() * 5))) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    rows.push({
      id: `wd_${driverId}_${idCounter++}`,
      driverId,
      date: date.toISOString(),
      amount: Math.round((40 + rand() * 320) * 100) / 100,
      status: d < 2 ? "processing" : "paid",
      method: "Bank transfer",
    });
  }

  rows.sort((a, b) => new Date(b.date) - new Date(a.date));
  cache.set(driverId, rows);
  return rows;
}

export async function listWithdrawalsForDriver(driverId, { limit = 20 } = {}) {
  const rows = generateHistory(driverId);
  return limit ? rows.slice(0, limit) : rows;
}

export async function recordWithdrawal(driverId, { amount, status = "processing", method = "Bank transfer" }) {
  const rows = generateHistory(driverId);
  const entry = {
    id: `wd_${driverId}_${Date.now()}`,
    driverId,
    date: new Date().toISOString(),
    amount,
    status,
    method,
  };
  rows.unshift(entry);
  return entry;
}

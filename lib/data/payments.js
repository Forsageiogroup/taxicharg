/**
 * MOCK DATA LAYER — payments / transactions
 * Deterministic pseudo-random ledger per driver so the dashboard has
 * realistic numbers without a database. Swap `generateLedger` for a real
 * query (e.g. `SELECT * FROM transactions WHERE driver_id = ...`) when
 * you connect a database — keep the same return shape.
 */

const METHODS = ["EFTPOS", "Card", "Cash", "Apple Pay"];
// Base outcome for a normal (non-failed, non-voided) transaction.
const STATUSES = ["settled", "settled", "settled", "pending"];
const CARD_BRANDS = ["Visa", "Mastercard", "Amex"];
const FAIL_REASONS = ["Card declined", "Insufficient funds", "Terminal offline", "Card expired", "Network timeout"];
const VOID_REASONS = ["Driver-initiated void", "Incorrect fare entered", "Duplicate charge corrected", "Admin correction"];

// Transactions with one of these statuses represent no real money moved
// (or money that was moved and then reversed same-day), so every revenue
// aggregate across the app must exclude them.
export function isMoneyStatus(status) {
  return status !== "failed" && status !== "voided";
}

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

function round2(n) {
  return Math.round(n * 100) / 100;
}

function fingerprint(rand) {
  return "fp_" + Math.floor(rand() * 0xffffffff).toString(16).padStart(8, "0");
}

function randomCard(rand) {
  return {
    brand: CARD_BRANDS[Math.floor(rand() * CARD_BRANDS.length)],
    last4: String(1000 + Math.floor(rand() * 9000)),
    fingerprint: fingerprint(rand),
  };
}

const ledgerCache = new Map();

function generateLedger(driverId, days = 60) {
  if (ledgerCache.has(driverId)) return ledgerCache.get(driverId);

  const rand = mulberry32(seedFromId(driverId));
  const now = new Date();
  const rows = [];
  let idCounter = 1;

  // A card this driver's own terminal has tapped repeatedly across
  // different days — the classic "self-tap for an instant payout, then
  // refund the passenger" pattern. Only some drivers ever trigger this
  // (real fraud isn't universal), and even then only a handful of times
  // over two months — a subtle pattern worth noticing, not a blatant one.
  const ownCard = randomCard(rand);
  const isSuspectDriver = rand() < 0.5;
  const reuseChance = isSuspectDriver ? 0.008 : 0;

  // Occasionally clone a trip into an accidental near-duplicate charge a
  // few minutes later, so "Possible duplicates" has real examples too.
  let pendingDuplicateOf = null;

  for (let d = days; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    date.setHours(0, 0, 0, 0);

    const tripsToday = Math.floor(rand() * 9) + 3; // 3-11 trips/day
    for (let t = 0; t < tripsToday; t++) {
      let fare, tip, method, txTime;
      if (pendingDuplicateOf) {
        ({ fare, tip, method } = pendingDuplicateOf);
        txTime = new Date(pendingDuplicateOf.txTime.getTime() + (2 + Math.floor(rand() * 7)) * 60000);
        pendingDuplicateOf = null;
      } else {
        fare = Math.round((15 + rand() * 60) * 100) / 100;
        tip = rand() > 0.6 ? Math.round(rand() * 8 * 100) / 100 : 0;
        method = METHODS[Math.floor(rand() * METHODS.length)];
        txTime = new Date(date);
        txTime.setHours(6 + Math.floor(rand() * 16), Math.floor(rand() * 60));
        if (d > 0 && rand() < 0.006) pendingDuplicateOf = { fare, tip, method, txTime };
      }

      // Reuse the driver's "own card" for a small slice of their
      // card-based transactions, spread across different days.
      const reusedOwnCard = method !== "Cash" && rand() < reuseChance;
      const card = method === "Cash" ? null : reusedOwnCard ? { ...ownCard } : randomCard(rand);

      // Roll the outcome: a small slice of transactions fail or get
      // voided before anything else is decided. Cash never "fails" or
      // gets "voided" the way a card/EFTPOS tap can — there's no gateway
      // to decline it or cancel it same-day.
      const outcomeRoll = rand();
      let status;
      if (method !== "Cash" && outcomeRoll < 0.015) {
        status = "failed";
      } else if (method !== "Cash" && outcomeRoll < 0.02) {
        status = "voided";
      } else {
        status = d === 0 ? "pending" : STATUSES[Math.floor(rand() * STATUSES.length)];
      }

      // A card that's been reused for self-taps is much more likely to
      // also show up refunded — that combination is the real red flag.
      const refundChance = reusedOwnCard ? 0.4 : 0.03;
      const refunded = status === "settled" && rand() < refundChance;
      const total = Math.round((fare + tip) * 100) / 100;

      rows.push({
        id: `txn_${driverId}_${idCounter++}`,
        driverId,
        date: txTime.toISOString(),
        fare,
        tip,
        total,
        method,
        card,
        status,
        reason: status === "failed" ? FAIL_REASONS[Math.floor(rand() * FAIL_REASONS.length)] : null,
        voidReason: status === "voided" ? VOID_REASONS[Math.floor(rand() * VOID_REASONS.length)] : null,
        fee: Math.round(fare * 0.019 * 100) / 100, // card/network processing fee
        commission: Math.round(fare * 0.08 * 100) / 100, // TaxiCharg platform commission
        refunded,
        refundAmount: refunded ? total : 0,
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

/** Every transaction across every driver, newest first — for the admin Payments page. */
export async function listAllPayments({ limit = 300 } = {}) {
  const { listDrivers } = await import("./drivers");
  const drivers = await listDrivers();
  const nameById = new Map(drivers.map((d) => [d.id, d.name]));

  const all = drivers.flatMap((d) =>
    generateLedger(d.id).map((r) => ({ ...r, driverName: nameById.get(d.id) || d.id }))
  );
  all.sort((a, b) => new Date(b.date) - new Date(a.date));
  return limit ? all.slice(0, limit) : all;
}

/**
 * Failed payments, voided transactions, possible duplicate charges, and
 * "same card reused across different days" security alerts — fleet-wide,
 * for the admin Payment issues page. Read-only/informational for now:
 * these flag things for a person to look into, they don't take action.
 */
export async function getPaymentIssuesSummary() {
  const { listDrivers } = await import("./drivers");
  const drivers = await listDrivers();
  const nameById = new Map(drivers.map((d) => [d.id, d.name]));

  const all = drivers.flatMap((d) =>
    generateLedger(d.id).map((r) => ({ ...r, driverName: nameById.get(d.id) || d.id }))
  );

  const byDate = (a, b) => new Date(b.date) - new Date(a.date);

  const failed = all.filter((r) => r.status === "failed").sort(byDate);
  const voided = all.filter((r) => r.status === "voided").sort(byDate);

  // Possible duplicates: same driver, (near) identical amount, within 15
  // minutes of each other — a driver accidentally charging twice.
  const duplicates = [];
  const byDriver = new Map();
  for (const r of all) {
    if (r.status === "failed") continue;
    if (!byDriver.has(r.driverId)) byDriver.set(r.driverId, []);
    byDriver.get(r.driverId).push(r);
  }
  for (const rows of byDriver.values()) {
    const sorted = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const minutesApart = (new Date(sorted[j].date) - new Date(sorted[i].date)) / 60000;
        if (minutesApart > 15) break; // sorted by time — nothing further will be within the window
        if (Math.abs(sorted[i].total - sorted[j].total) < 0.01) {
          duplicates.push({
            id: `${sorted[i].id}__${sorted[j].id}`,
            driverId: sorted[i].driverId,
            driverName: sorted[i].driverName,
            first: sorted[i],
            second: sorted[j],
            minutesApart: Math.max(1, Math.round(minutesApart)),
          });
        }
      }
    }
  }
  duplicates.sort(byDate2);
  function byDate2(a, b) {
    return new Date(b.second.date) - new Date(a.second.date);
  }

  // Security alerts: the same card used by the same driver across two or
  // more different calendar days — the pattern worth a human looking at,
  // especially when one of those charges was later refunded or voided.
  const byDriverCard = new Map();
  for (const r of all) {
    if (!r.card) continue;
    const key = `${r.driverId}::${r.card.fingerprint}`;
    if (!byDriverCard.has(key)) byDriverCard.set(key, []);
    byDriverCard.get(key).push(r);
  }
  const cardAlerts = [];
  for (const rows of byDriverCard.values()) {
    const days = new Set(rows.map((r) => r.date.slice(0, 10)));
    if (days.size < 2) continue;
    const flagged = rows.some((r) => r.refunded || r.status === "voided");
    const sortedRows = [...rows].sort(byDate);
    cardAlerts.push({
      id: `${rows[0].driverId}::${rows[0].card.fingerprint}`,
      driverId: rows[0].driverId,
      driverName: rows[0].driverName,
      card: rows[0].card,
      occurrences: rows.length,
      daysUsed: days.size,
      totalAmount: round2(rows.reduce((a, r) => a + r.total, 0)),
      flagged,
      transactions: sortedRows,
    });
  }
  cardAlerts.sort((a, b) => Number(b.flagged) - Number(a.flagged) || b.daysUsed - a.daysUsed);

  return { failed, voided, duplicates, cardAlerts };
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

  // Failed/voided transactions never moved real money — exclude them from
  // every revenue figure below (they still show up in the ledger itself).
  const moneyRows = rows.filter((r) => isMoneyStatus(r.status));

  const todayRows = moneyRows.filter((r) => new Date(r.date) >= startOfToday);
  const weekRows = moneyRows.filter((r) => new Date(r.date) >= startOfWeek);
  const monthRows = moneyRows.filter((r) => new Date(r.date) >= startOfMonth);
  const pendingRows = moneyRows.filter((r) => r.status === "pending");
  const settledRows = moneyRows.filter((r) => r.status === "settled");

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

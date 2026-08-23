// One-time demo data seed — recreates the same 4 demo drivers and 4
// vehicles the app used to ship with as in-memory mock data, so the
// demo logins (driver@taxicharg.com.au / admin@taxicharg.com.au) keep
// working after moving to a real database.
//
// Safe to rerun: uses ON CONFLICT DO NOTHING, so it never overwrites
// data that's already there (e.g. after an admin has made changes).
//
// Usage: node scripts/seed.mjs

import { getPool } from "../lib/db.js";

// Same deterministic generator the old in-memory mock layer used, kept
// here only so demo drivers seed with realistic-looking withdrawal
// history instead of an empty table.
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

function generateWithdrawalHistory(driverId) {
  const rand = mulberry32(seedFromId(driverId) ^ 0x51a1);
  const now = new Date();
  const rows = [];
  let idCounter = 1;

  for (let d = 0; d < 45; d += Math.max(1, Math.floor(rand() * 5))) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    rows.push({
      id: `wd_seed_${driverId}_${idCounter++}`,
      driverId,
      date: date.toISOString(),
      amount: Math.round((40 + rand() * 320) * 100) / 100,
      status: d < 2 ? "processing" : "paid",
      method: "Bank transfer",
    });
  }
  return rows;
}

const drivers = [
  {
    id: "drv_001",
    driverId: "24776032",
    name: "Amir Hussain",
    email: "driver@taxicharg.com.au",
    password: "TaxiCharg123",
    phone: "0412 345 678",
    plate: "NSW-TX01",
    abn: "65 641 737 591",
    terminalNumber: "50665616",
    paymentMethod: "Cash",
    fleet: "Sydney Taxi Co.",
    status: "active",
    balance: 842.35,
    joinedAt: "2025-02-11",
    connections: {
      clover: { connected: false, merchantId: null, connectedAt: null },
      stripe: { connected: false, accountId: null, payoutsEnabled: false, connectedAt: null },
    },
  },
  {
    id: "drv_002",
    driverId: "24776090",
    name: "Trang Nguyen",
    email: "trang.nguyen@example.com",
    password: "password123",
    phone: "0423 111 222",
    plate: "NSW-TX02",
    abn: "71 220 415 903",
    terminalNumber: "50665701",
    paymentMethod: "EFTPOS",
    fleet: "Metro Cabs",
    status: "active",
    balance: 1204.9,
    joinedAt: "2024-11-02",
    connections: {
      clover: { connected: true, merchantId: "CLV-88213", connectedAt: "2025-01-05" },
      stripe: { connected: true, accountId: "acct_mock_002", payoutsEnabled: true, connectedAt: "2025-01-06" },
    },
  },
  {
    id: "drv_003",
    driverId: "24776144",
    name: "Wei Zhang",
    email: "wei.zhang@example.com",
    password: "password123",
    phone: "0434 555 999",
    plate: "NSW-TX03",
    abn: "38 904 552 217",
    terminalNumber: "50665742",
    paymentMethod: "Cash",
    fleet: "Sydney Taxi Co.",
    status: "suspended",
    balance: 0,
    joinedAt: "2024-06-18",
    connections: {
      clover: { connected: false, merchantId: null, connectedAt: null },
      stripe: { connected: false, accountId: null, payoutsEnabled: false, connectedAt: null },
    },
  },
  {
    id: "drv_004",
    driverId: "24776201",
    name: "Priya Chandran",
    email: "priya.chandran@example.com",
    password: "password123",
    phone: "0455 222 888",
    plate: "NSW-TX04",
    abn: "12 337 880 664",
    terminalNumber: "50665809",
    paymentMethod: "EFTPOS",
    fleet: "Metro Cabs",
    status: "active",
    balance: 356.1,
    joinedAt: "2025-05-30",
    connections: {
      clover: { connected: true, merchantId: "CLV-77410", connectedAt: "2025-06-02" },
      stripe: { connected: false, accountId: null, payoutsEnabled: false, connectedAt: null },
    },
  },
];

const vehicles = [
  { id: "veh_001", vehicle: "CAB 101", rego: "NSW-TX01", terminalId: "TC-CAB-101", driverId: "drv_001", provider: "Clover", merchantRef: "CLV-77410" },
  { id: "veh_002", vehicle: "CAB 102", rego: "NSW-TX02", terminalId: "TC-CAB-102", driverId: "drv_002", provider: "Clover", merchantRef: "" },
  { id: "veh_003", vehicle: "CAB 103", rego: "NSW-TX03", terminalId: "TC-CAB-103", driverId: "drv_003", provider: "Tyro", merchantRef: "TYR-84021" },
  { id: "veh_004", vehicle: "CAB 104", rego: "NSW-TX04", terminalId: "TC-CAB-104", driverId: "drv_004", provider: "Clover", merchantRef: "" },
];

async function main() {
  const pool = getPool();

  for (const d of drivers) {
    await pool.query(
      `INSERT INTO drivers
        (id, driver_id, name, email, password, phone, plate, abn, terminal_number, payment_method, fleet, status, balance, joined_at, connections)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO NOTHING`,
      [
        d.id,
        d.driverId,
        d.name,
        d.email,
        d.password,
        d.phone,
        d.plate,
        d.abn,
        d.terminalNumber,
        d.paymentMethod,
        d.fleet,
        d.status,
        d.balance,
        d.joinedAt,
        JSON.stringify(d.connections),
      ]
    );
  }
  console.log(`Seeded ${drivers.length} drivers (skipped any that already existed).`);

  for (const v of vehicles) {
    await pool.query(
      `INSERT INTO vehicles (id, vehicle, rego, terminal_id, driver_id, provider, merchant_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [v.id, v.vehicle, v.rego, v.terminalId, v.driverId, v.provider, v.merchantRef]
    );
  }
  console.log(`Seeded ${vehicles.length} vehicles (skipped any that already existed).`);

  let withdrawalCount = 0;
  for (const d of drivers) {
    for (const w of generateWithdrawalHistory(d.id)) {
      await pool.query(
        `INSERT INTO withdrawals (id, driver_id, date, amount, status, method)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO NOTHING`,
        [w.id, w.driverId, w.date, w.amount, w.status, w.method]
      );
      withdrawalCount++;
    }
  }
  console.log(`Seeded ${withdrawalCount} withdrawal history rows (skipped any that already existed).`);

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});

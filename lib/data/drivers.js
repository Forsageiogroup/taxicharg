/**
 * MOCK DATA LAYER — drivers
 * -------------------------------------------------------------------
 * Everything in this file lives in memory and resets whenever the
 * serverless function cold-starts. It exists so the whole product can
 * be demoed and iterated on with zero backend setup.
 *
 * To go live, replace the functions below with real queries (Supabase,
 * Postgres, Prisma, etc.) but KEEP THE SAME FUNCTION SIGNATURES — every
 * page/API route in the app only imports from this file, so that's the
 * single place you need to touch.
 * -------------------------------------------------------------------
 */

export const DEMO_DRIVER_CREDENTIALS = {
  email: "driver@taxicharg.com.au",
  password: "TaxiCharg123",
};

export const DEMO_ADMIN_CREDENTIALS = {
  email: "admin@taxicharg.com.au",
  password: "AdminTaxi123",
};

const drivers = [
  {
    id: "drv_001",
    name: "Amir Hussain",
    email: DEMO_DRIVER_CREDENTIALS.email,
    password: DEMO_DRIVER_CREDENTIALS.password, // NOTE: plaintext for demo only — hash with bcrypt/argon2 in production
    phone: "0412 345 678",
    plate: "NSW-TX01",
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
    name: "Trang Nguyen",
    email: "trang.nguyen@example.com",
    password: "password123",
    phone: "0423 111 222",
    plate: "NSW-TX02",
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
    name: "Wei Zhang",
    email: "wei.zhang@example.com",
    password: "password123",
    phone: "0434 555 999",
    plate: "NSW-TX03",
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
    name: "Priya Chandran",
    email: "priya.chandran@example.com",
    password: "password123",
    phone: "0455 222 888",
    plate: "NSW-TX04",
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

function clone(x) {
  return x ? JSON.parse(JSON.stringify(x)) : x;
}

export async function listDrivers() {
  return clone(drivers);
}

export async function findDriverByEmail(email) {
  const d = drivers.find((d) => d.email.toLowerCase() === String(email).toLowerCase());
  return clone(d);
}

export async function findDriverById(id) {
  const d = drivers.find((d) => d.id === id);
  return clone(d);
}

export async function verifyDriverPassword(email, password) {
  const d = drivers.find((d) => d.email.toLowerCase() === String(email).toLowerCase());
  if (!d) return null;
  return d.password === password ? clone(d) : null;
}

export async function updateDriverConnection(id, provider, patch) {
  const d = drivers.find((d) => d.id === id);
  if (!d) return null;
  d.connections[provider] = { ...d.connections[provider], ...patch };
  return clone(d);
}

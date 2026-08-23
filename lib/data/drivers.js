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
    driverId: "24776032",
    name: "Amir Hussain",
    email: DEMO_DRIVER_CREDENTIALS.email,
    password: DEMO_DRIVER_CREDENTIALS.password, // NOTE: plaintext for demo only — hash with bcrypt/argon2 in production
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

const EDITABLE_PROFILE_FIELDS = ["plate", "abn"];

export async function updateDriverProfile(id, patch) {
  const d = drivers.find((d) => d.id === id);
  if (!d) return null;
  for (const key of EDITABLE_PROFILE_FIELDS) {
    if (patch[key] !== undefined) d[key] = patch[key];
  }
  return clone(d);
}

/* ------------------------- Admin-only actions ------------------------- */

function randomTempPassword() {
  return Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
}

/**
 * Issues a temporary password for a driver (admin action). In production
 * this should email/SMS the driver a reset link instead of returning the
 * password directly — it's returned here only so the demo admin UI has
 * something to show.
 */
export async function resetDriverPassword(id) {
  const d = drivers.find((d) => d.id === id);
  if (!d) return null;
  const tempPassword = randomTempPassword();
  d.password = tempPassword;
  return { driver: clone(d), tempPassword };
}

export async function setDriverStatus(id, status) {
  const d = drivers.find((d) => d.id === id);
  if (!d) return null;
  d.status = status;
  return clone(d);
}

/** Admin creates driver accounts directly — drivers never self-register. */
export async function createDriver({ name, email, phone, plate, fleet }) {
  const id = `drv_${String(drivers.length + 1).padStart(3, "0")}_${Math.random().toString(36).slice(2, 6)}`;
  const driverId = String(Math.floor(20000000 + Math.random() * 9999999));
  const tempPassword = randomTempPassword();

  const driver = {
    id,
    driverId,
    name,
    email,
    password: tempPassword,
    phone: phone || "",
    plate: plate || "",
    abn: "",
    terminalNumber: String(Math.floor(50000000 + Math.random() * 999999)),
    paymentMethod: "Cash",
    fleet: fleet || "",
    status: "active",
    balance: 0,
    joinedAt: new Date().toISOString().slice(0, 10),
    connections: {
      clover: { connected: false, merchantId: null, connectedAt: null },
      stripe: { connected: false, accountId: null, payoutsEnabled: false, connectedAt: null },
    },
  };

  drivers.push(driver);
  return { driver: clone(driver), tempPassword };
}

/**
 * DATA LAYER — drivers (backed by Postgres)
 * -------------------------------------------------------------------
 * Every page/API route in the app only imports from this file, so it's
 * the one place that talks to the `drivers` table directly. Run
 * `node scripts/migrate.mjs` once to create the tables, and
 * `node scripts/seed.mjs` once to load the demo accounts.
 * -------------------------------------------------------------------
 */

import { query } from "@/lib/db";

// Re-exported for any existing imports — new code should import these
// directly from "@/lib/demoCredentials" instead (see that file for why).
export { DEMO_DRIVER_CREDENTIALS, DEMO_ADMIN_CREDENTIALS } from "@/lib/demoCredentials";

const SELECT_FIELDS = `
  id, driver_id AS "driverId", name, email, password, phone, plate, abn,
  terminal_number AS "terminalNumber", payment_method AS "paymentMethod",
  fleet, status, balance::float AS balance,
  to_char(joined_at, 'YYYY-MM-DD') AS "joinedAt", connections
`;

function rowToDriver(row) {
  if (!row) return null;
  return { ...row, balance: Number(row.balance) };
}

export async function listDrivers() {
  const { rows } = await query(`SELECT ${SELECT_FIELDS} FROM drivers ORDER BY joined_at ASC`);
  return rows.map(rowToDriver);
}

export async function findDriverByEmail(email) {
  const { rows } = await query(
    `SELECT ${SELECT_FIELDS} FROM drivers WHERE lower(email) = lower($1)`,
    [email]
  );
  return rowToDriver(rows[0]);
}

export async function findDriverById(id) {
  const { rows } = await query(`SELECT ${SELECT_FIELDS} FROM drivers WHERE id = $1`, [id]);
  return rowToDriver(rows[0]);
}

export async function verifyDriverPassword(email, password) {
  const driver = await findDriverByEmail(email);
  if (!driver) return null;
  return driver.password === password ? driver : null;
}

export async function updateDriverConnection(id, provider, patch) {
  const driver = await findDriverById(id);
  if (!driver) return null;

  const nextConnections = {
    ...driver.connections,
    [provider]: { ...driver.connections[provider], ...patch },
  };

  const { rows } = await query(
    `UPDATE drivers SET connections = $2 WHERE id = $1 RETURNING ${SELECT_FIELDS}`,
    [id, JSON.stringify(nextConnections)]
  );
  return rowToDriver(rows[0]);
}

const EDITABLE_PROFILE_FIELDS = { plate: "plate", abn: "abn" };

export async function updateDriverProfile(id, patch) {
  const sets = [];
  const values = [id];
  let i = 2;
  for (const [key, column] of Object.entries(EDITABLE_PROFILE_FIELDS)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = $${i++}`);
      values.push(patch[key]);
    }
  }
  if (!sets.length) return findDriverById(id);

  const { rows } = await query(
    `UPDATE drivers SET ${sets.join(", ")} WHERE id = $1 RETURNING ${SELECT_FIELDS}`,
    values
  );
  return rowToDriver(rows[0]);
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
  const tempPassword = randomTempPassword();
  const { rows } = await query(
    `UPDATE drivers SET password = $2 WHERE id = $1 RETURNING ${SELECT_FIELDS}`,
    [id, tempPassword]
  );
  if (!rows[0]) return null;
  return { driver: rowToDriver(rows[0]), tempPassword };
}

export async function setDriverStatus(id, status) {
  const { rows } = await query(
    `UPDATE drivers SET status = $2 WHERE id = $1 RETURNING ${SELECT_FIELDS}`,
    [id, status]
  );
  return rowToDriver(rows[0]);
}

/** Admin creates driver accounts directly — drivers never self-register. */
export async function createDriver({ name, email, phone, plate, fleet }) {
  const id = `drv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const driverId = String(Math.floor(20000000 + Math.random() * 9999999));
  const tempPassword = randomTempPassword();

  const { rows } = await query(
    `INSERT INTO drivers
      (id, driver_id, name, email, password, phone, plate, terminal_number, fleet)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING ${SELECT_FIELDS}`,
    [
      id,
      driverId,
      name,
      email,
      tempPassword,
      phone || "",
      plate || "",
      String(Math.floor(50000000 + Math.random() * 999999)),
      fleet || "",
    ]
  );

  return { driver: rowToDriver(rows[0]), tempPassword };
}

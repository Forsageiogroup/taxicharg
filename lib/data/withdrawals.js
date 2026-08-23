/**
 * DATA LAYER — withdrawal history (backed by Postgres)
 * Demo drivers are seeded with some historical rows by scripts/seed.mjs;
 * every withdrawal a driver actually requests from here on is a real
 * row in the `withdrawals` table.
 */

import { query } from "@/lib/db";

export async function listWithdrawalsForDriver(driverId, { limit = 20 } = {}) {
  const { rows } = await query(
    `SELECT id, driver_id AS "driverId", date, amount::float AS amount, status, method
     FROM withdrawals WHERE driver_id = $1 ORDER BY date DESC
     ${limit ? "LIMIT $2" : ""}`,
    limit ? [driverId, limit] : [driverId]
  );
  return rows.map((r) => ({ ...r, date: new Date(r.date).toISOString() }));
}

export async function recordWithdrawal(driverId, { amount, status = "processing", method = "Bank transfer" }) {
  const id = `wd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const { rows } = await query(
    `INSERT INTO withdrawals (id, driver_id, amount, status, method)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, driver_id AS "driverId", date, amount::float AS amount, status, method`,
    [id, driverId, amount, status, method]
  );
  const r = rows[0];
  return { ...r, date: new Date(r.date).toISOString() };
}

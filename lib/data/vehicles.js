/**
 * DATA LAYER — vehicles & terminals (backed by Postgres)
 * One EFTPOS terminal per vehicle; a vehicle is assigned to a driver.
 * Terminal "health" is derived from that driver's most recent (mock)
 * transaction so it moves believably instead of being a hardcoded value.
 */

import { query } from "@/lib/db";
import { listDrivers } from "./drivers";
import { listPaymentsForDriver } from "./payments";
import { PROVIDERS } from "@/lib/terminalProviders";

// Re-exported for convenience for any server-side code that already imports
// from this module — client components should import PROVIDERS directly
// from lib/terminalProviders.js instead (see that file for why).
export { PROVIDERS };

const VEHICLE_FIELDS = `id, vehicle, rego, terminal_id AS "terminalId", driver_id AS "driverId",
       provider, merchant_ref AS "merchantRef"`;

function minutesAgo(date) {
  return Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
}

/** Vehicles joined with their assigned driver's name and last-seen terminal activity. */
export async function listVehicles() {
  const [{ rows }, drivers] = await Promise.all([
    query(`SELECT ${VEHICLE_FIELDS} FROM vehicles ORDER BY created_at ASC`),
    listDrivers(),
  ]);
  const nameById = new Map(drivers.map((d) => [d.id, d.name]));

  return Promise.all(
    rows.map(async (v) => {
      let health = { status: "inactive", label: "No activity yet" };
      if (v.driverId) {
        const payments = await listPaymentsForDriver(v.driverId, { limit: 1 });
        if (payments.length) {
          const mins = minutesAgo(payments[0].date);
          health = { status: "active", label: `${mins}m ago`, minutesAgo: mins };
        }
      }
      return { ...v, driverName: v.driverId ? nameById.get(v.driverId) || null : null, health };
    })
  );
}

export async function listDriverOptions() {
  const drivers = await listDrivers();
  return drivers.map((d) => ({ id: d.id, name: d.name }));
}

export async function assignVehicleDriver(vehicleId, driverId) {
  const { rows } = await query(
    `UPDATE vehicles SET driver_id = $2 WHERE id = $1 RETURNING ${VEHICLE_FIELDS}`,
    [vehicleId, driverId || null]
  );
  return rows[0] || null;
}

/** Admin-entered record of which company's terminal is in a vehicle — see PROVIDERS above. */
export async function updateVehicleTerminal(vehicleId, { provider, merchantRef }) {
  const { rows } = await query(
    `UPDATE vehicles SET provider = $2, merchant_ref = $3 WHERE id = $1 RETURNING ${VEHICLE_FIELDS}`,
    [vehicleId, provider || "Clover", merchantRef || ""]
  );
  return rows[0] || null;
}

export async function createVehicle({
  vehicle,
  rego,
  terminalId,
  driverId = null,
  provider = "Clover",
  merchantRef = "",
}) {
  const id = `veh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const { rows } = await query(
    `INSERT INTO vehicles (id, vehicle, rego, terminal_id, driver_id, provider, merchant_ref)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING ${VEHICLE_FIELDS}`,
    [id, vehicle, rego, terminalId || "", driverId || null, provider || "Clover", merchantRef || ""]
  );
  return rows[0];
}

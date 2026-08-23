/**
 * DATA LAYER — vehicles & terminals (backed by Postgres)
 * One EFTPOS terminal per vehicle; a vehicle is assigned to a driver.
 * Terminal "health" is derived from that driver's most recent (mock)
 * transaction so it moves believably instead of being a hardcoded value.
 */

import { query } from "@/lib/db";
import { listDrivers } from "./drivers";
import { listPaymentsForDriver } from "./payments";

function minutesAgo(date) {
  return Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
}

/** Vehicles joined with their assigned driver's name and last-seen terminal activity. */
export async function listVehicles() {
  const [{ rows }, drivers] = await Promise.all([
    query(
      `SELECT id, vehicle, rego, terminal_id AS "terminalId", driver_id AS "driverId"
       FROM vehicles ORDER BY created_at ASC`
    ),
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
    `UPDATE vehicles SET driver_id = $2 WHERE id = $1
     RETURNING id, vehicle, rego, terminal_id AS "terminalId", driver_id AS "driverId"`,
    [vehicleId, driverId || null]
  );
  return rows[0] || null;
}

export async function createVehicle({ vehicle, rego, terminalId, driverId = null }) {
  const id = `veh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const { rows } = await query(
    `INSERT INTO vehicles (id, vehicle, rego, terminal_id, driver_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, vehicle, rego, terminal_id AS "terminalId", driver_id AS "driverId"`,
    [id, vehicle, rego, terminalId || "", driverId || null]
  );
  return rows[0];
}

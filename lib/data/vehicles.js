/**
 * MOCK DATA LAYER — vehicles & terminals
 * One EFTPOS terminal per vehicle; a vehicle is assigned to a driver.
 * Terminal "health" is derived from that driver's most recent transaction
 * so it moves believably instead of being a hardcoded value.
 *
 * Swap point: replace the in-memory array + functions below with real
 * queries once you have a database — keep the same function signatures.
 */

import { listDrivers } from "./drivers";
import { listPaymentsForDriver } from "./payments";

const vehicles = [
  { id: "veh_001", vehicle: "CAB 101", rego: "NSW-TX01", terminalId: "TC-CAB-101", driverId: "drv_001" },
  { id: "veh_002", vehicle: "CAB 102", rego: "NSW-TX02", terminalId: "TC-CAB-102", driverId: "drv_002" },
  { id: "veh_003", vehicle: "CAB 103", rego: "NSW-TX03", terminalId: "TC-CAB-103", driverId: "drv_003" },
  { id: "veh_004", vehicle: "CAB 104", rego: "NSW-TX04", terminalId: "TC-CAB-104", driverId: "drv_004" },
];

function clone(x) {
  return x ? JSON.parse(JSON.stringify(x)) : x;
}

function minutesAgo(date) {
  return Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
}

/** Vehicles joined with their assigned driver's name and last-seen terminal activity. */
export async function listVehicles() {
  const drivers = await listDrivers();
  const nameById = new Map(drivers.map((d) => [d.id, d.name]));

  const withHealth = await Promise.all(
    vehicles.map(async (v) => {
      let health = { status: "inactive", label: "No activity yet" };
      if (v.driverId) {
        const rows = await listPaymentsForDriver(v.driverId, { limit: 1 });
        if (rows.length) {
          const mins = minutesAgo(rows[0].date);
          health = { status: "active", label: `${mins}m ago`, minutesAgo: mins };
        }
      }
      return {
        ...clone(v),
        driverName: v.driverId ? nameById.get(v.driverId) || null : null,
        health,
      };
    })
  );

  return withHealth;
}

export async function listDriverOptions() {
  const drivers = await listDrivers();
  return drivers.map((d) => ({ id: d.id, name: d.name }));
}

export async function assignVehicleDriver(vehicleId, driverId) {
  const v = vehicles.find((v) => v.id === vehicleId);
  if (!v) return null;
  v.driverId = driverId || null;
  return clone(v);
}

export async function createVehicle({ vehicle, rego, terminalId, driverId = null }) {
  const id = `veh_${String(vehicles.length + 1).padStart(3, "0")}_${Math.random().toString(36).slice(2, 6)}`;
  const v = { id, vehicle, rego, terminalId, driverId };
  vehicles.push(v);
  return clone(v);
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StatusPill from "@/components/dashboard/StatusPill";
import EditTerminalModal from "./EditTerminalModal";

export default function VehiclesTable({ vehicles, driverOptions }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  async function handleAssign(vehicleId, driverId) {
    setBusyId(vehicleId);
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicleId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: driverId || null }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-navy-400 border-b border-navy-900/5">
              <th className="px-6 py-3 font-medium">Vehicle</th>
              <th className="px-6 py-3 font-medium">Rego</th>
              <th className="px-6 py-3 font-medium">Terminal</th>
              <th className="px-6 py-3 font-medium">Provider</th>
              <th className="px-6 py-3 font-medium">Terminal health</th>
              <th className="px-6 py-3 font-medium">Assigned driver</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} className="border-b border-navy-900/5 last:border-0 hover:bg-navy-950/[0.015]">
                <td className="px-6 py-3.5 font-semibold text-navy-900">{v.vehicle}</td>
                <td className="px-6 py-3.5 text-navy-600">{v.rego}</td>
                <td className="px-6 py-3.5 text-navy-600">{v.terminalId}</td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-navy-950/[0.05] text-navy-700">
                        {v.provider}
                      </span>
                      {v.merchantRef && (
                        <p className="mt-1 text-[11px] text-navy-400 font-mono truncate max-w-[10rem]">
                          {v.merchantRef}
                        </p>
                      )}
                    </div>
                    <EditTerminalModal vehicle={v} />
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center gap-2">
                    <StatusPill status={v.health.status === "active" ? "connected" : "disconnected"} />
                    <span className="text-xs text-navy-400">{v.health.label}</span>
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <select
                    value={v.driverId || ""}
                    onChange={(e) => handleAssign(v.id, e.target.value)}
                    disabled={busyId === v.id}
                    className="rounded-lg border border-navy-900/10 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {driverOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-navy-400">
                  No vehicles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

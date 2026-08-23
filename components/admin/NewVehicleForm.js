"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import TerminalProviderFields from "./TerminalProviderFields";

const EMPTY = { vehicle: "", rego: "", terminalId: "", driverId: "", provider: "Clover", merchantRef: "" };

export default function NewVehicleForm({ driverOptions }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setOpen(false);
    setForm(EMPTY);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, driverId: form.driverId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not add vehicle.");
        return;
      }
      close();
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white brand-gradient hover:opacity-90"
      >
        <Plus className="w-4 h-4" /> New vehicle
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-full max-w-md rounded-2xl bg-white card-shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-navy-900 text-lg">New vehicle</h2>
              <button onClick={close} className="text-navy-400 hover:text-navy-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-navy-500 mb-1">Vehicle name</label>
                <input
                  required
                  placeholder="CAB 105"
                  value={form.vehicle}
                  onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-500 mb-1">Rego</label>
                <input
                  required
                  value={form.rego}
                  onChange={(e) => setForm({ ...form, rego: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-500 mb-1">Terminal ID</label>
                <input
                  value={form.terminalId}
                  onChange={(e) => setForm({ ...form, terminalId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy-500 mb-1">Assign driver</label>
                <select
                  value={form.driverId}
                  onChange={(e) => setForm({ ...form, driverId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Unassigned</option>
                  {driverOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <TerminalProviderFields
                provider={form.provider}
                merchantRef={form.merchantRef}
                onChange={({ provider, merchantRef }) => setForm({ ...form, provider, merchantRef })}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 mt-2 px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Add vehicle
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

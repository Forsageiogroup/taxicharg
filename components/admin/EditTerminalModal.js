"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Loader2 } from "lucide-react";
import TerminalProviderFields from "./TerminalProviderFields";

export default function EditTerminalModal({ vehicle }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ provider: vehicle.provider, merchantRef: vehicle.merchantRef || "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openModal() {
    setForm({ provider: vehicle.provider, merchantRef: vehicle.merchantRef || "" });
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.provider.trim()) {
      setError("Enter a provider or company name.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vehicles/${vehicle.id}/terminal`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save.");
        return;
      }
      setOpen(false);
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
        onClick={openModal}
        title="Edit terminal provider"
        className="text-navy-300 hover:text-orange-500 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white card-shadow p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-navy-900 text-lg">Terminal provider</h2>
              <button onClick={() => setOpen(false)} className="text-navy-400 hover:text-navy-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-navy-400 mb-4">
              {vehicle.vehicle} · {vehicle.rego}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <TerminalProviderFields
                provider={form.provider}
                merchantRef={form.merchantRef}
                onChange={setForm}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 mt-2 px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

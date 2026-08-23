"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, CheckCircle2, Copy } from "lucide-react";

const EMPTY = { name: "", email: "", phone: "", plate: "", fleet: "" };

export default function NewDriverForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  function close() {
    setOpen(false);
    setForm(EMPTY);
    setError("");
    setResult(null);
    setCopied(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create driver.");
        return;
      }
      setResult(data);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyPassword() {
    navigator.clipboard?.writeText(result.tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-white brand-gradient hover:opacity-90"
      >
        <Plus className="w-4 h-4" /> New driver
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative w-full max-w-md rounded-2xl bg-white card-shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-navy-900 text-lg">
                {result ? "Driver created" : "New driver"}
              </h2>
              <button onClick={close} className="text-navy-400 hover:text-navy-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {result ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>
                    <strong>{result.driver.name}</strong> can now sign in with{" "}
                    <strong>{result.driver.email}</strong>. Share this temporary password with them —
                    it won&apos;t be shown again.
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-navy-900/10 px-4 py-3">
                  <code className="font-mono text-sm text-navy-900">{result.tempPassword}</code>
                  <button
                    onClick={copyPassword}
                    className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"
                  >
                    <Copy className="w-3.5 h-3.5" /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <button
                  onClick={close}
                  className="w-full px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-navy-500 mb-1">Full name</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-500 mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-navy-500 mb-1">Phone</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy-500 mb-1">Plate</label>
                    <input
                      value={form.plate}
                      onChange={(e) => setForm({ ...form, plate: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-navy-500 mb-1">Fleet</label>
                  <input
                    value={form.fleet}
                    onChange={(e) => setForm({ ...form, fleet: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 mt-2 px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create driver
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

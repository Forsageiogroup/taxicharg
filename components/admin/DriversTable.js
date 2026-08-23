"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Copy, CheckCircle2 } from "lucide-react";
import StatusPill from "@/components/dashboard/StatusPill";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default function DriversTable({ drivers }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [resetResult, setResetResult] = useState(null); // { driverId, tempPassword }
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.plate.toLowerCase().includes(q)
    );
  }, [drivers, query]);

  async function handleResetPassword(driverId) {
    setBusyId(driverId);
    setResetResult(null);
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setResetResult({ driverId, tempPassword: data.tempPassword });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleStatus(driver) {
    const nextStatus = driver.status === "active" ? "suspended" : "active";
    setBusyId(driver.id);
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function copyPassword(pw) {
    navigator.clipboard?.writeText(pw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-900/5 flex items-center justify-between gap-4 flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drivers..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <p className="text-xs text-navy-400">Accounts are created here — drivers never self-register.</p>
      </div>

      {resetResult && (
        <div className="px-6 py-3 border-b border-navy-900/5 bg-green-50 flex items-center justify-between gap-4 flex-wrap">
          <span className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            New temporary password for {drivers.find((d) => d.id === resetResult.driverId)?.name}:
            <code className="font-mono font-semibold">{resetResult.tempPassword}</code>
          </span>
          <button
            onClick={() => copyPassword(resetResult.tempPassword)}
            className="flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-800"
          >
            <Copy className="w-3.5 h-3.5" /> {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-navy-400 border-b border-navy-900/5">
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Fleet</th>
              <th className="px-4 py-3 font-medium">Plate</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Clover</th>
              <th className="px-4 py-3 font-medium">Stripe</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-navy-900/5 last:border-0 hover:bg-navy-950/[0.015]">
                <td className="px-4 py-3.5">
                  <Link href={`/admin/drivers/${d.id}`} className="font-semibold text-navy-900 hover:text-orange-600">
                    {d.name}
                  </Link>
                  <p className="text-xs text-navy-400">{d.email}</p>
                </td>
                <td className="px-4 py-3.5 text-navy-600 max-w-[8rem] truncate">{d.fleet}</td>
                <td className="px-4 py-3.5 text-navy-600">{d.plate}</td>
                <td className="px-4 py-3.5 font-semibold text-navy-900 whitespace-nowrap">{currency(d.balance)}</td>
                <td className="px-4 py-3.5">
                  <StatusPill status={d.connections.clover.connected ? "connected" : "disconnected"} />
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill status={d.connections.stripe.connected ? "connected" : "disconnected"} />
                </td>
                <td className="px-4 py-3.5">
                  <StatusPill status={d.status} />
                </td>
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => handleResetPassword(d.id)}
                    disabled={busyId === d.id}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50 mr-3"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => handleToggleStatus(d)}
                    disabled={busyId === d.id}
                    className={`text-xs font-semibold disabled:opacity-50 ${
                      d.status === "active" ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"
                    }`}
                  >
                    {d.status === "active" ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-navy-400">
                  No drivers match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

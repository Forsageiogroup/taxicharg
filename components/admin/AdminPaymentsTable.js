"use client";

import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import StatusPill from "@/components/dashboard/StatusPill";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

function toCSV(rows) {
  const header = ["Date", "Driver", "Method", "Fare", "Tip", "Fee", "Total", "Status"];
  const lines = rows.map((r) =>
    [new Date(r.date).toISOString(), r.driverName, r.method, r.fare, r.tip, r.fee, r.total, r.status].join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export default function AdminPaymentsTable({ payments, drivers }) {
  const [query, setQuery] = useState("");
  const [driverId, setDriverId] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (driverId !== "all" && p.driverId !== driverId) return false;
      if (status !== "all" && p.status !== status) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!p.driverName.toLowerCase().includes(q) && !p.method.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [payments, query, driverId, status]);

  const totals = useMemo(() => {
    const gross = filtered.reduce((a, r) => a + r.total, 0);
    const tips = filtered.reduce((a, r) => a + r.tip, 0);
    const driversTotal = filtered.reduce((a, r) => a + (r.total - r.commission), 0);
    const company = filtered.reduce((a, r) => a + r.commission, 0);
    return { gross, tips, driversTotal, company };
  }, [filtered]);

  function handleExport() {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taxicharg-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-900/5 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-navy-500">
          <span>
            <strong className="text-navy-900">{filtered.length}</strong> payments
          </span>
          <span>
            gross <strong className="text-navy-900">{currency(totals.gross)}</strong>
          </span>
          <span>
            tips <strong className="text-navy-900">{currency(totals.tips)}</strong>
          </span>
          <span>
            drivers <strong className="text-green-600">{currency(totals.driversTotal)}</strong>
          </span>
          <span>
            company <strong className="text-orange-600">{currency(totals.company)}</strong>
          </span>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-navy-900/5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search driver or method..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="rounded-lg border border-navy-900/10 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="all">All drivers</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-navy-900/10 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="all">All statuses</option>
            <option value="settled">Settled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-navy-900/10 hover:bg-navy-950/[0.03] whitespace-nowrap"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto max-h-[36rem]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-navy-400 border-b border-navy-900/5">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Driver</th>
              <th className="px-6 py-3 font-medium">Method</th>
              <th className="px-6 py-3 font-medium">Fare</th>
              <th className="px-6 py-3 font-medium">Tip</th>
              <th className="px-6 py-3 font-medium">Total</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-navy-900/5 last:border-0">
                <td className="px-6 py-3 text-navy-700 whitespace-nowrap">
                  {new Date(r.date).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-6 py-3 text-navy-900 font-medium whitespace-nowrap">{r.driverName}</td>
                <td className="px-6 py-3 text-navy-700 whitespace-nowrap">{r.method}</td>
                <td className="px-6 py-3 text-navy-700">{currency(r.fare)}</td>
                <td className="px-6 py-3 text-navy-700">{r.tip ? currency(r.tip) : "—"}</td>
                <td className="px-6 py-3 font-semibold text-navy-900">{currency(r.total)}</td>
                <td className="px-6 py-3">
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-navy-400">
                  No payments match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import StatusPill from "./StatusPill";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

function toCSV(rows) {
  const header = ["Date", "Method", "Fare", "Tip", "Fee", "Total", "Status"];
  const lines = rows.map((r) =>
    [
      new Date(r.date).toISOString(),
      r.method,
      r.fare,
      r.tip,
      r.fee,
      r.total,
      r.status,
    ].join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export default function PaymentsTable({ payments }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (query && !p.method.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [payments, query, status]);

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
      <div className="px-6 py-4 border-b border-navy-900/5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by method..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
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

      <div className="overflow-x-auto max-h-[32rem]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-navy-400 border-b border-navy-900/5">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Method</th>
              <th className="px-6 py-3 font-medium">Fare</th>
              <th className="px-6 py-3 font-medium">Tip</th>
              <th className="px-6 py-3 font-medium">Fee</th>
              <th className="px-6 py-3 font-medium">Total</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-navy-900/5 last:border-0">
                <td className="px-6 py-3 text-navy-700 whitespace-nowrap">
                  {new Date(r.date).toLocaleString("en-AU", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-6 py-3 text-navy-700 whitespace-nowrap">{r.method}</td>
                <td className="px-6 py-3 text-navy-700">{currency(r.fare)}</td>
                <td className="px-6 py-3 text-navy-700">{currency(r.tip)}</td>
                <td className="px-6 py-3 text-navy-400">-{currency(r.fee)}</td>
                <td className="px-6 py-3 font-semibold text-navy-900">{currency(r.total)}</td>
                <td className="px-6 py-3">
                  <StatusPill status={r.status} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-navy-400">
                  No transactions match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

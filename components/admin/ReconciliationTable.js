"use client";

import { Download } from "lucide-react";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

const dateLabel = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-AU", { weekday: "short", day: "2-digit", month: "short" });

function toCSV(rows) {
  const header = ["Date", "Trips", "Fares", "Tips", "Gross", "Drivers", "Company"];
  const lines = rows.map((r) => [r.date, r.trips, r.fares, r.tips, r.gross, r.drivers, r.company].join(","));
  return [header.join(","), ...lines].join("\n");
}

export default function ReconciliationTable({ rows }) {
  const totals = rows.reduce(
    (acc, r) => ({
      trips: acc.trips + r.trips,
      fares: acc.fares + r.fares,
      tips: acc.tips + r.tips,
      gross: acc.gross + r.gross,
      drivers: acc.drivers + r.drivers,
      company: acc.company + r.company,
    }),
    { trips: 0, fares: 0, tips: 0, gross: 0, drivers: 0, company: 0 }
  );

  function handleExport() {
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taxicharg-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-900/5 flex items-center justify-end">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-navy-900/10 hover:bg-navy-950/[0.03]"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-navy-400 border-b border-navy-900/5">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium text-right">Trips</th>
              <th className="px-6 py-3 font-medium text-right">Fares</th>
              <th className="px-6 py-3 font-medium text-right">Tips</th>
              <th className="px-6 py-3 font-medium text-right">Gross</th>
              <th className="px-6 py-3 font-medium text-right">Drivers</th>
              <th className="px-6 py-3 font-medium text-right">Company</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className="border-b border-navy-900/5 last:border-0">
                <td className="px-6 py-3 text-navy-900 font-medium whitespace-nowrap">{dateLabel(r.date)}</td>
                <td className="px-6 py-3 text-right text-navy-700">{r.trips}</td>
                <td className="px-6 py-3 text-right text-navy-700">{currency(r.fares)}</td>
                <td className="px-6 py-3 text-right text-navy-400">{currency(r.tips)}</td>
                <td className="px-6 py-3 text-right font-semibold text-navy-900">{currency(r.gross)}</td>
                <td className="px-6 py-3 text-right font-semibold text-green-600">{currency(r.drivers)}</td>
                <td className="px-6 py-3 text-right font-semibold text-orange-600">{currency(r.company)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-navy-900/10 bg-navy-950/[0.02]">
              <td className="px-6 py-3 font-bold text-navy-900">Total</td>
              <td className="px-6 py-3 text-right font-bold text-navy-900">{totals.trips}</td>
              <td className="px-6 py-3 text-right font-bold text-navy-900">{currency(totals.fares)}</td>
              <td className="px-6 py-3 text-right font-bold text-navy-900">{currency(totals.tips)}</td>
              <td className="px-6 py-3 text-right font-bold text-navy-900">{currency(totals.gross)}</td>
              <td className="px-6 py-3 text-right font-bold text-green-600">{currency(totals.drivers)}</td>
              <td className="px-6 py-3 text-right font-bold text-orange-600">{currency(totals.company)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

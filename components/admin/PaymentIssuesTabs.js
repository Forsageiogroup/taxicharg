"use client";

import { Fragment, useMemo, useState } from "react";
import { AlertTriangle, Ban, Copy, ShieldAlert, Download } from "lucide-react";
import StatusPill from "@/components/dashboard/StatusPill";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

const fmtDateTime = (d) =>
  new Date(d).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const fmtDate = (d) => new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

function download(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-navy-900/10 hover:bg-navy-950/[0.03] whitespace-nowrap"
    >
      <Download className="w-4 h-4" /> Export CSV
    </button>
  );
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-10 text-center text-navy-400">
        {children}
      </td>
    </tr>
  );
}

function FailedTable({ rows }) {
  function handleExport() {
    const header = ["Date", "Driver", "Method", "Amount", "Reason"];
    const lines = rows.map((r) => [new Date(r.date).toISOString(), r.driverName, r.method, r.total, r.reason].join(","));
    download(`taxicharg-failed-payments-${new Date().toISOString().slice(0, 10)}.csv`, [header.join(","), ...lines].join("\n"));
  }

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-900/5 flex items-center justify-between">
        <p className="text-sm text-navy-500">
          <strong className="text-navy-900">{rows.length}</strong> failed payment attempts — no money moved on these.
        </p>
        <ExportButton onClick={handleExport} />
      </div>
      <div className="overflow-x-auto max-h-[32rem]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-navy-400 border-b border-navy-900/5">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Driver</th>
              <th className="px-6 py-3 font-medium">Method</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-navy-900/5 last:border-0">
                <td className="px-6 py-3 text-navy-700 whitespace-nowrap">{fmtDateTime(r.date)}</td>
                <td className="px-6 py-3 text-navy-900 font-medium whitespace-nowrap">{r.driverName}</td>
                <td className="px-6 py-3 text-navy-700 whitespace-nowrap">{r.method}</td>
                <td className="px-6 py-3 font-semibold text-navy-900">{currency(r.total)}</td>
                <td className="px-6 py-3 text-navy-700">{r.reason}</td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyRow colSpan={5}>No failed payments — clean record.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VoidedTable({ rows }) {
  function handleExport() {
    const header = ["Date", "Driver", "Method", "Amount", "Reason"];
    const lines = rows.map((r) => [new Date(r.date).toISOString(), r.driverName, r.method, r.total, r.voidReason].join(","));
    download(`taxicharg-voided-transactions-${new Date().toISOString().slice(0, 10)}.csv`, [header.join(","), ...lines].join("\n"));
  }

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-900/5 flex items-center justify-between">
        <p className="text-sm text-navy-500">
          <strong className="text-navy-900">{rows.length}</strong> voided transactions — cancelled same-day, before settlement.
        </p>
        <ExportButton onClick={handleExport} />
      </div>
      <div className="overflow-x-auto max-h-[32rem]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-navy-400 border-b border-navy-900/5">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Driver</th>
              <th className="px-6 py-3 font-medium">Method</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-navy-900/5 last:border-0">
                <td className="px-6 py-3 text-navy-700 whitespace-nowrap">{fmtDateTime(r.date)}</td>
                <td className="px-6 py-3 text-navy-900 font-medium whitespace-nowrap">{r.driverName}</td>
                <td className="px-6 py-3 text-navy-700 whitespace-nowrap">{r.method}</td>
                <td className="px-6 py-3 font-semibold text-navy-900">{currency(r.total)}</td>
                <td className="px-6 py-3 text-navy-700">{r.voidReason}</td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyRow colSpan={5}>No voided transactions — clean record.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DuplicatesTable({ rows }) {
  function handleExport() {
    const header = ["Driver", "First charge", "Second charge", "Amount", "Minutes apart"];
    const lines = rows.map((r) =>
      [r.driverName, new Date(r.first.date).toISOString(), new Date(r.second.date).toISOString(), r.first.total, r.minutesApart].join(",")
    );
    download(`taxicharg-possible-duplicates-${new Date().toISOString().slice(0, 10)}.csv`, [header.join(","), ...lines].join("\n"));
  }

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-900/5 flex items-center justify-between">
        <p className="text-sm text-navy-500">
          <strong className="text-navy-900">{rows.length}</strong> pairs of near-identical charges from the same driver, close together in time.
        </p>
        <ExportButton onClick={handleExport} />
      </div>
      <div className="overflow-x-auto max-h-[32rem]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-navy-400 border-b border-navy-900/5">
              <th className="px-6 py-3 font-medium">Driver</th>
              <th className="px-6 py-3 font-medium">First charge</th>
              <th className="px-6 py-3 font-medium">Second charge</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Apart</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-navy-900/5 last:border-0">
                <td className="px-6 py-3 text-navy-900 font-medium whitespace-nowrap">{r.driverName}</td>
                <td className="px-6 py-3 text-navy-700 whitespace-nowrap">{fmtDateTime(r.first.date)}</td>
                <td className="px-6 py-3 text-navy-700 whitespace-nowrap">{fmtDateTime(r.second.date)}</td>
                <td className="px-6 py-3 font-semibold text-navy-900">
                  {currency(r.first.total)} <span className="text-navy-400 font-normal">each</span>
                </td>
                <td className="px-6 py-3 text-navy-700 whitespace-nowrap">{r.minutesApart} min</td>
              </tr>
            ))}
            {rows.length === 0 && <EmptyRow colSpan={5}>No possible duplicates found.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SecurityAlertsTable({ rows }) {
  const [openId, setOpenId] = useState(null);

  function handleExport() {
    const header = ["Driver", "Card", "Days used", "Occurrences", "Total amount", "Refunded or voided after reuse"];
    const lines = rows.map((r) =>
      [r.driverName, `${r.card.brand} ••••${r.card.last4}`, r.daysUsed, r.occurrences, r.totalAmount, r.flagged ? "Yes" : "No"].join(",")
    );
    download(`taxicharg-security-alerts-${new Date().toISOString().slice(0, 10)}.csv`, [header.join(","), ...lines].join("\n"));
  }

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-navy-900/5 flex items-center justify-between">
        <p className="text-sm text-navy-500">
          <strong className="text-navy-900">{rows.length}</strong> cards used by the same driver on 2 or more different days.
        </p>
        <ExportButton onClick={handleExport} />
      </div>
      <div className="overflow-x-auto max-h-[36rem]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-navy-400 border-b border-navy-900/5">
              <th className="px-6 py-3 font-medium">Driver</th>
              <th className="px-6 py-3 font-medium">Card</th>
              <th className="px-6 py-3 font-medium">Days used</th>
              <th className="px-6 py-3 font-medium">Charges</th>
              <th className="px-6 py-3 font-medium">Total</th>
              <th className="px-6 py-3 font-medium">Flag</th>
              <th className="px-6 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr
                  onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  className={`border-b border-navy-900/5 last:border-0 cursor-pointer hover:bg-navy-950/[0.015] ${
                    r.flagged ? "bg-red-50/40" : ""
                  }`}
                >
                  <td className="px-6 py-3 text-navy-900 font-medium whitespace-nowrap">{r.driverName}</td>
                  <td className="px-6 py-3 text-navy-700 whitespace-nowrap">
                    {r.card.brand} •••• {r.card.last4}
                  </td>
                  <td className="px-6 py-3 text-navy-700">{r.daysUsed} days</td>
                  <td className="px-6 py-3 text-navy-700">{r.occurrences}</td>
                  <td className="px-6 py-3 font-semibold text-navy-900">{currency(r.totalAmount)}</td>
                  <td className="px-6 py-3">
                    {r.flagged ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                        <AlertTriangle className="w-3.5 h-3.5" /> Refunded/voided
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                        Watch
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-navy-400 text-xs whitespace-nowrap">
                    {openId === r.id ? "Hide" : "View"} charges
                  </td>
                </tr>
                {openId === r.id && (
                  <tr className="bg-navy-950/[0.015]">
                    <td colSpan={7} className="px-6 py-4">
                      <p className="text-xs font-semibold text-navy-500 mb-2 uppercase tracking-wide">
                        Every charge on this card
                      </p>
                      <div className="space-y-1.5">
                        {r.transactions.map((t) => (
                          <div key={t.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border border-navy-900/5">
                            <span className="text-navy-600">{fmtDateTime(t.date)}</span>
                            <span className="text-navy-700">{t.method}</span>
                            <span className="font-semibold text-navy-900">{currency(t.total)}</span>
                            <StatusPill status={t.status} />
                            {t.refunded && (
                              <span className="text-red-600 font-semibold">Refunded</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {rows.length === 0 && <EmptyRow colSpan={7}>No repeat-card patterns found — clean record.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const TABS = [
  { key: "security", label: "Security alerts", icon: ShieldAlert },
  { key: "failed", label: "Failed", icon: AlertTriangle },
  { key: "voided", label: "Voided", icon: Ban },
  { key: "duplicates", label: "Possible duplicates", icon: Copy },
];

export default function PaymentIssuesTabs({ failed, voided, duplicates, cardAlerts }) {
  const [tab, setTab] = useState("security");

  const counts = useMemo(
    () => ({ security: cardAlerts.length, failed: failed.length, voided: voided.length, duplicates: duplicates.length }),
    [failed, voided, duplicates, cardAlerts]
  );

  const flaggedCount = cardAlerts.filter((c) => c.flagged).length;

  return (
    <div>
      <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-5 mb-6">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => {
            const active = tab === t.key;
            const urgent = t.key === "security" && flaggedCount > 0;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? "bg-navy-900 text-white"
                    : "text-navy-600 hover:bg-navy-950/[0.04]"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                <span
                  className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[11px] font-bold ${
                    active
                      ? "bg-white/20 text-white"
                      : urgent
                      ? "bg-red-100 text-red-700"
                      : "bg-navy-950/[0.06] text-navy-500"
                  }`}
                >
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "security" && (
        <>
          <p className="text-sm text-navy-500 mb-4 max-w-3xl">
            Flags when the same card is tapped by the same driver on 2 or more different days — a pattern worth checking, since it can mean a driver is charging their own card to trigger an instant payout and later refunding the fare. Rows marked{" "}
            <strong className="text-red-600">Refunded/voided</strong> are the highest priority — that combination is the clearest sign something needs a closer look. Card numbers are never stored in full, only the last 4 digits.
          </p>
          <SecurityAlertsTable rows={cardAlerts} />
        </>
      )}
      {tab === "failed" && <FailedTable rows={failed} />}
      {tab === "voided" && <VoidedTable rows={voided} />}
      {tab === "duplicates" && <DuplicatesTable rows={duplicates} />}
    </div>
  );
}

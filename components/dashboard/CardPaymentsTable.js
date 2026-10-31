/** tc-0016: his card fares from the TaxiCharg terminal - one line each, phone and desktop.
 *  tc-0017: the fare, his commission and what is his - never the service charge (the owner, 31 Oct). */
import StatusPill from "./StatusPill";

const currency = (n) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
const when = (d) => new Date(d).toLocaleString("en-AU", { timeZone: "Australia/Sydney", day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" });
const PILL = { paid: "paid", refunded: "voided", partly_refunded: "pending", disputed: "failed", processing: "processing", failed: "failed" };
const SHARE = { sent: "settled", waiting: "pending", returned: "voided", partly: "pending", none: "default" };

export default function CardPaymentsTable({ rows, empty = "No card fares yet." }) {
  if (!rows.length) return <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 text-sm text-navy-500">{empty}</div>;
  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      {/* phone: one card per fare */}
      <ul className="sm:hidden divide-y divide-navy-900/5">
        {rows.map((r) => (
          <li key={r.id} className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-navy-900">{currency(r.fare)}</span>
              <StatusPill status={PILL[r.status.key] || "default"} label={r.status.label} />
            </div>
            <div className="mt-1 text-xs text-navy-500">{when(r.date)} · {r.source}{r.card ? ` · ${r.card}` : ""} · Ref {r.ref}</div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div><div className="text-navy-400">Fare</div><div className="font-semibold text-navy-800">{currency(r.fare)}</div></div>
              <div><div className="text-navy-400">Your commission</div><div className="font-semibold text-navy-800">{currency(r.commission)}</div></div>
              <div><div className="text-navy-400">Yours</div><div className="font-semibold text-green-700">{currency(r.yours)}</div></div>
            </div>
            <div className="mt-2"><StatusPill status={SHARE[r.paidToYou.key]} label={r.paidToYou.label} /></div>
          </li>
        ))}
      </ul>
      {/* desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-950/[0.02] text-navy-500 text-xs uppercase tracking-wide">
            <tr>
              {["Date", "Ref", "From", "Card", "Fare", "Your commission", "Yours", "Status", "Paid to you"].map((h) => (
                <th key={h} className="text-left font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-900/5">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 whitespace-nowrap">{when(r.date)}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.ref}</td>
                <td className="px-4 py-3">{r.source}</td>
                <td className="px-4 py-3 whitespace-nowrap">{r.card || "-"}</td>
                <td className="px-4 py-3">{currency(r.fare)}</td>
                <td className="px-4 py-3">{currency(r.commission)}</td>
                <td className="px-4 py-3 font-semibold text-green-700">{currency(r.yours)}</td>
                <td className="px-4 py-3"><StatusPill status={PILL[r.status.key] || "default"} label={r.status.label} /></td>
                <td className="px-4 py-3"><StatusPill status={SHARE[r.paidToYou.key]} label={r.paidToYou.label} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import StatusPill from "./StatusPill";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default function WithdrawHistory({ driverName, history }) {
  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-navy-400 border-b border-navy-900/5">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Driver</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-navy-900/5 last:border-0">
                <td className="px-6 py-3.5 text-navy-700 whitespace-nowrap">
                  {new Date(h.date).toLocaleDateString("en-AU", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-6 py-3.5 text-navy-700">{driverName}</td>
                <td className="px-6 py-3.5 font-semibold text-navy-900">{currency(h.amount)}</td>
                <td className="px-6 py-3.5">
                  <StatusPill status={h.status} />
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-navy-400">
                  No withdrawals yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

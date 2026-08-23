const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });

export default function LivePaymentsFeed({ payments, vehicleByDriver }) {
  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow h-full flex flex-col">
      <div className="px-6 py-4 border-b border-navy-900/5 flex items-center justify-between">
        <h2 className="font-bold text-navy-900">Live payments</h2>
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
        </span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-navy-900/5 max-h-96">
        {payments.map((p) => (
          <div key={p.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-navy-900 text-sm truncate">{p.driverName}</p>
              <p className="text-xs text-navy-400">
                {timeLabel(p.date)}
                {vehicleByDriver?.[p.driverId] ? ` · ${vehicleByDriver[p.driverId]}` : ""} · {p.method}
              </p>
            </div>
            <span className="font-bold text-green-600 whitespace-nowrap">+{currency(p.total)}</span>
          </div>
        ))}
        {payments.length === 0 && (
          <div className="px-6 py-10 text-center text-navy-400 text-sm">No payments yet.</div>
        )}
      </div>
    </div>
  );
}

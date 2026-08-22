export default function StatCard({ label, value, sub, icon: Icon, accent = false }) {
  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 p-6 card-shadow">
      <div className="flex items-start justify-between">
        <span className="text-sm text-navy-500 font-medium">{label}</span>
        {Icon && (
          <span
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              accent ? "brand-gradient" : "bg-navy-950/[0.04]"
            }`}
          >
            <Icon className={`w-4.5 h-4.5 ${accent ? "text-white" : "text-navy-500"}`} />
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-extrabold text-navy-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-navy-400">{sub}</div>}
    </div>
  );
}

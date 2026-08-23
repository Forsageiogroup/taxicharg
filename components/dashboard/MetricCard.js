import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function MetricCard({ label, value, changePct }) {
  const positive = changePct >= 0;
  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 p-6 card-shadow">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-navy-500 font-medium">{label}</span>
        {typeof changePct === "number" && (
          <span
            className={`flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-md shrink-0 ${
              positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(changePct)}%
          </span>
        )}
      </div>
      <div className="mt-3 text-2xl font-extrabold text-navy-900">{value}</div>
    </div>
  );
}

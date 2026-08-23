import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default function AdminMetricCard({ label, value, changePct, trips, driversTotal, companyTotal }) {
  const flat = changePct === null || changePct === undefined || Math.abs(changePct) < 0.5;
  const up = !flat && changePct > 0;

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 p-6 card-shadow">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-wider text-navy-400 uppercase">{label}</span>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <span className="text-2xl sm:text-3xl font-extrabold text-navy-900">{currency(value)}</span>
        <span
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
            flat
              ? "bg-navy-950/[0.05] text-navy-400"
              : up
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {flat ? (
            <Minus className="w-3 h-3" />
          ) : up ? (
            <ArrowUpRight className="w-3 h-3" />
          ) : (
            <ArrowDownRight className="w-3 h-3" />
          )}
          {!flat && `${Math.abs(changePct)}%`}
        </span>
      </div>
      <p className="mt-2 text-xs text-navy-400">
        {trips} trips · drivers <span className="font-semibold text-green-600">{currency(driversTotal)}</span> · company{" "}
        <span className="font-semibold text-orange-600">{currency(companyTotal)}</span>
      </p>
    </div>
  );
}

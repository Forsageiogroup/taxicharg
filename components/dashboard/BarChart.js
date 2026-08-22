export default function BarChart({ data, labelKey, valueKey, formatValue = (v) => v }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d[labelKey]} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-xs text-navy-500 truncate">{d[labelKey]}</span>
          <div className="flex-1 h-3 rounded-full bg-navy-950/[0.05] overflow-hidden">
            <div
              className="h-full brand-gradient rounded-full"
              style={{ width: `${Math.max((d[valueKey] / max) * 100, 3)}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-xs font-semibold text-navy-800 text-right">
            {formatValue(d[valueKey])}
          </span>
        </div>
      ))}
    </div>
  );
}

"use client";

const SERIES = [
  { key: "gross", label: "Gross", color: "#94a3b8" },
  { key: "drivers", label: "Drivers", color: "#22c55e" },
  { key: "company", label: "Company", color: "#eb5835" },
];

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit" });
};

export default function RevenueChart({ data }) {
  if (!data?.length) return null;

  const width = 720;
  const height = 240;
  const padding = { top: 12, right: 12, bottom: 28, left: 56 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...data.flatMap((d) => [d.gross, d.drivers, d.company]), 1);
  const niceMax = Math.ceil(maxVal / 4) * 4 || 1;

  const x = (i) => padding.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * innerW);
  const y = (v) => padding.top + innerH - (v / niceMax) * innerH;

  const linePath = (key) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ");

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Fleet revenue chart">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(t)}
              y2={y(t)}
              stroke="currentColor"
              className="text-navy-900/5"
              strokeWidth="1"
            />
            <text x={padding.left - 8} y={y(t) + 4} textAnchor="end" className="fill-navy-400 text-[10px]">
              {currency(t)}
            </text>
          </g>
        ))}

        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text
              key={d.date}
              x={x(i)}
              y={height - 6}
              textAnchor="middle"
              className="fill-navy-400 text-[10px]"
            >
              {shortDate(d.date)}
            </text>
          ) : null
        )}

        {SERIES.map((s) => (
          <path key={s.key} d={linePath(s.key)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        ))}

        {SERIES.map((s) => {
          const last = data[data.length - 1];
          return (
            <circle
              key={s.key}
              cx={x(data.length - 1)}
              cy={y(last[s.key])}
              r="3.5"
              fill={s.color}
            />
          );
        })}
      </svg>

      <div className="flex items-center gap-5 mt-2 px-1">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-xs text-navy-500">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

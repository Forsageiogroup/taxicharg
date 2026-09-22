/**
 * A drawn version of the real driver dashboard, for the home page. Built
 * with CSS so it stays crisp at any size; the figures are examples.
 */
import { Mark } from "../Logo";

export default function DashboardMock({ className = "" }) {
  const rows = [
    ["Today 14:12", "Card · Tap", "$38.40", "Settled"],
    ["Today 12:47", "Card · Insert", "$62.10", "Settled"],
    ["Today 11:05", "Card · Tap", "$24.90", "Pending"],
    ["Yesterday", "Card · Tap", "$51.30", "Settled"],
  ];
  return (
    <div className={`rounded-2xl bg-white border border-navy-900/10 shadow-[0_30px_60px_-30px_rgba(10,14,19,.45)] overflow-hidden ${className}`}>
      <div className="flex">
        <aside className="hidden sm:block w-36 bg-navy-950 text-white/70 p-4 text-[11px] space-y-3">
          <div className="flex items-center gap-1.5 font-display font-black text-white text-sm tracking-tight"><Mark size={18} />TAXI<span className="text-orange-500">CHARG</span></div>
          <div className="pt-2 space-y-2">
            <div className="text-white bg-white/10 rounded-md px-2 py-1">Overview</div>
            <div className="px-2">Payments</div>
            <div className="px-2">Reports</div>
            <div className="px-2">Withdraw funds</div>
            <div className="px-2">Profile</div>
          </div>
        </aside>
        <div className="flex-1 p-4 sm:p-5 bg-[#f6f7f9]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-navy-500">Available to withdraw</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-navy-900 tabular-nums">$1,246.70</div>
            </div>
            <div className="brand-gradient text-white text-[11px] font-bold px-3 py-1.5 rounded-full">Withdraw</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[["This week", "$2,318"], ["Fares", "61"], ["Avg fare", "$38"]].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-white border border-navy-900/5 p-2">
                <div className="text-[9px] uppercase tracking-wider text-navy-500">{k}</div>
                <div className="text-sm font-bold text-navy-900 tabular-nums">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-white border border-navy-900/5 overflow-hidden">
            {rows.map((r, i) => (
              <div key={i} className={`grid grid-cols-[1.2fr_1fr_.8fr_.8fr] gap-2 px-3 py-2 text-[10px] sm:text-[11px] ${i ? "border-t border-navy-900/5" : ""}`}>
                <span className="text-navy-700">{r[0]}</span>
                <span className="text-navy-500">{r[1]}</span>
                <span className="font-semibold text-navy-900 tabular-nums">{r[2]}</span>
                <span className={r[3] === "Settled" ? "text-green-700" : "text-amber-700"}>{r[3]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

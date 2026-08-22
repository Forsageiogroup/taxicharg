const STYLES = {
  settled: "bg-green-50 text-green-700",
  active: "bg-green-50 text-green-700",
  connected: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  suspended: "bg-red-50 text-red-700",
  disconnected: "bg-navy-950/[0.05] text-navy-500",
  default: "bg-navy-950/[0.05] text-navy-500",
};

export default function StatusPill({ status }) {
  const cls = STYLES[status] || STYLES.default;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
}

/**
 * tc-0014 (31 Oct 2026): the Report page's download - the period's numbers on top, then one line
 * per fare. Opens in Excel. Kept pure so it can be tested.
 */
const SYD = { timeZone: "Australia/Sydney", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false };

function cell(v) {
  const s = v == null ? "" : String(v);
  // a cell starting = + - @ would run as a formula in Excel: prefix it
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? "'" + s : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
const money = (n) => (Math.round(Number(n || 0) * 100) / 100).toFixed(2);

export function reportCsv({ name, from, to, metrics, paidOut, balance, rows }) {
  const out = [];
  out.push(["TaxiCharg report", name || ""], ["From", from], ["To", to], []);
  out.push(["Total face value", money(metrics.faceValue)], ["Your commission", money(metrics.commission)], ["Transactions", metrics.transactions],
    ["Fees", money(metrics.feesPaid)], ["Refunds", money(metrics.refunds)], ["Net to you after fees", money(metrics.netToYou)],
    ["Paid out to you", money(paidOut)], ["Clover balance now", money(balance)], []);
  out.push(["Date (Sydney)", "Status", "Method", "Card", "Fare", "Service fee", "Commission", "Refund", "Net to you", "Note"]);
  for (const r of rows) {
    const net = r.net != null ? Number(r.net) : Number(r.total || 0) - Number(r.fee || 0) + Number(r.commission || 0) - Number(r.refundAmount || 0);
    out.push([new Date(r.date).toLocaleString("en-AU", SYD), r.status, r.method || "", r.card || "", money(r.total), money(r.fee), money(r.commission),
      money(r.refundAmount), money(r.status === "settled" ? net : 0), r.voidReason || r.reason || r.note || ""]);
  }
  return out.map((line) => line.map(cell).join(",")).join("\r\n") + "\r\n";
}

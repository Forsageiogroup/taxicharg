/**
 * The S710 card fares as the driver sees them (tc-0016, 31 Oct 2026). Pure:
 * no database, no Stripe - so every figure is tested on its own
 * (test/card-pages.test.mjs).
 *
 * One row per card fare taken on his TaxiCharg terminal (tc_card_payments,
 * migration 320). What is HIS: the fare plus his commission, sent to his
 * payout account once the card is paid; a refund or a dispute takes some or
 * all of it back.
 *
 * tc-0017 (the owner, 31 Oct: "I don't think so we have to show the driver
 * about much service charges we are getting. this should not be in the
 * transaction details of the driver side"): the service charge TaxiCharg
 * keeps, and the card total (which would show it), are NOT in anything the
 * driver sees - not on the pages, not in the download, not in the app's
 * answer. The passenger still sees it on the S710 before paying and on the
 * receipt.
 */

const SYD = { timeZone: "Australia/Sydney", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false };
const c2d = (c) => Math.round(Number(c || 0)) / 100;

/** What the driver reads for "paid to you". */
export function shareState(r) {
  if (r.transfer_status === "reversed") return { key: "returned", label: "Taken back" };
  if (r.transfer_status === "partly_reversed") return { key: "partly", label: "Partly taken back" };
  if (r.transfer_status === "sent" || r.transfer_id) return { key: "sent", label: "In your balance" };
  if (r.status === "succeeded") return { key: "waiting", label: "On its way" };
  return { key: "none", label: "-" };
}

/** What happened to the fare itself. */
export function fareState(r) {
  if (r.status !== "succeeded") return r.status === "processing" ? { key: "processing", label: "Processing" } : { key: "failed", label: "Not paid" };
  if (r.disputed) return { key: "disputed", label: "Disputed" };
  if (r.refunded_cents >= r.amount_cents) return { key: "refunded", label: "Refunded" };
  if (r.refunded_cents > 0) return { key: "partly_refunded", label: "Partly refunded" };
  return { key: "paid", label: "Paid" };
}

/** tc_card_payments rows -> the rows the pages and the app show (dollars, newest first). */
export function cardRows(rows) {
  return (rows || [])
    .filter((r) => r.status === "succeeded" || r.status === "processing")
    .map((r) => ({
      id: r.id,
      ref: String(r.id || "").slice(0, 8).toUpperCase(),
      date: r.succeeded_at || r.created_at,
      source: r.source === "meter" ? "Meter" : "Typed",
      fare: c2d(r.fare_cents),
      commission: c2d(r.commission_cents),
      share: c2d(r.driver_share_cents),
      takenBack: c2d(r.reversed_cents),
      yours: c2d(r.driver_share_cents - (r.reversed_cents || 0)),
      card: r.card_last4 ? `${String(r.card_brand || "Card").toUpperCase()} ${r.card_last4}` : "",
      status: fareState(r),
      paidToYou: shareState(r),
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

/** The period's totals. */
export function cardTotals(rows) {
  const t = { fares: 0, transactions: 0, commission: 0, share: 0, takenBack: 0, yours: 0 };
  for (const r of rows) {
    if (r.status.key === "failed" || r.status.key === "processing") continue;
    t.transactions += 1;
    t.fares += r.fare; t.commission += r.commission;
    t.share += r.share; t.takenBack += r.takenBack; t.yours += r.yours;
  }
  for (const k of Object.keys(t)) if (k !== "transactions") t[k] = Math.round(t[k] * 100) / 100;
  return t;
}

/** Sydney-day range filter, as the Clover report (from / to = YYYY-MM-DD, both included). */
export function inDays(rows, from, to) {
  const day = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  return rows.filter((r) => { const x = day(r.date); return (!from || x >= from) && (!to || x <= to); });
}

function cell(v) {
  const s = v == null ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s) ? "'" + s : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
const money = (n) => (Math.round(Number(n || 0) * 100) / 100).toFixed(2);

/** The download: totals on top, then one line per card fare. Opens in Excel. */
export function cardCsv({ name, from, to, totals, rows }) {
  const out = [["TaxiCharg card payments", name || ""], ["From", from], ["To", to], [],
    ["Card fares", totals.transactions], ["Fares", money(totals.fares)],
    ["Your commission", money(totals.commission)], ["Taken back (refunds / disputes)", money(totals.takenBack)], ["Yours", money(totals.yours)], [],
    ["Date (Sydney)", "Ref", "From", "Card", "Fare", "Your commission", "Yours", "Status", "Paid to you"]];
  for (const r of rows) {
    out.push([new Date(r.date).toLocaleString("en-AU", SYD), r.ref, r.source, r.card, money(r.fare), money(r.commission), money(r.yours), r.status.label, r.paidToYou.label]);
  }
  return out.map((l) => l.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** Stripe's payout -> what the driver reads. */
export function payoutView(p) {
  const label = { paid: "Paid to your bank", pending: "Requested", in_transit: "On its way to your bank", canceled: "Cancelled", failed: "Failed" }[p.status] || p.status;
  const instant = p.method === "instant";
  return {
    id: p.id,
    amount: c2d(p.amount),
    instant,
    fee: c2d(p.application_fee_amount || 0),
    status: p.status,
    label: instant && p.status === "in_transit" ? "On its way - about 30 minutes" : label,
    requestedAt: p.created ? new Date(p.created * 1000).toISOString() : null,
    arrivesOn: p.arrival_date ? new Date(p.arrival_date * 1000).toISOString().slice(0, 10) : null,
    failure: p.failure_message || null,
  };
}

/** His balance in Stripe -> dollars. */
export function balanceView(b) {
  const pick = (list) => c2d((list || []).filter((x) => x.currency === "aud").reduce((a, x) => a + Number(x.amount || 0), 0));
  return { available: pick(b?.available), onTheWay: pick(b?.pending) };
}

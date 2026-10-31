/**
 * tc-0014 (31 Oct 2026) - the sums on the Report page, on their own so they can be tested.
 * Rows are the shapes lib/data/payments.js returns (one per Clover sale or takings report).
 */
import { sydneyMidnight, addDays } from "@/lib/time/sydney";

export function round2(n) { return Math.round(Number(n || 0) * 100) / 100; }

/** What a row left in his balance: a Clover sale knows it (net); a report is its total less fees and refunds. */
export function rowNet(r) {
  if (r.net != null) return Number(r.net);
  return Number(r.total || 0) - Number(r.fee || 0) + Number(r.commission || 0) - Number(r.refundAmount || 0);
}

/** Rows inside a Sydney From-To (both days included). */
export function inSydneyRange(rows, from, to, dateKey = "date") {
  const a = sydneyMidnight(from).getTime(), b = sydneyMidnight(addDays(to, 1)).getTime();
  return rows.filter((r) => { const t = new Date(r[dateKey]).getTime(); return t >= a && t < b; });
}

/**
 * The period's numbers. Before tc-0014 "Amount settled" was the card total of the settled
 * fares ($30.00 for a $30 fare) - not what he was owed after the Service fee ($28.50).
 *   netToYou  - what the fares left him: total, less the Service fee, plus his commission, less refunds
 */
export function summarise(rows) {
  const faceValue = round2(rows.reduce((a, r) => a + Number(r.total || 0), 0));
  const commission = round2(rows.reduce((a, r) => a + Number(r.commission || 0), 0));
  const feesPaid = round2(rows.reduce((a, r) => a + Number(r.fee || 0), 0));
  const refunds = round2(rows.reduce((a, r) => a + Number(r.refundAmount || 0), 0));
  const settledRows = rows.filter((r) => r.status === "settled");
  const netToYou = round2(settledRows.reduce((a, r) => a + rowNet(r), 0));
  return {
    faceValue, commission, feesPaid, refunds, totalFeesAndRefunds: round2(feesPaid + refunds), netToYou,
    transactions: rows.reduce((a, r) => a + (r.transactions || 0), 0) || rows.length,
  };
}

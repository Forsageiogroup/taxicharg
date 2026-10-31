/**
 * tc-0013 (31 Oct 2026) - what the TaxiCharg site shows is decided by the
 * TERMINALS assigned to the person, and each side shows only its own money.
 *
 * The owner: "we need to work on the basis of terminals user ... if aslam was
 * using clover terminal then he should not see anything under taxicharg in
 * stripe bal ... now aslam want to use the stripe. then aslam accounts gets
 * refresh and only shows the stripe things." Both assigned: both, side by
 * side. Moved off Clover: Clover disappears at once (the office pays any
 * Clover money left from the panel).
 *
 *   Clover (FareTap) - manual payout: his Clover sales in the SYD CABS wallet
 *                      (fare, 5% Service fee, commission, voids, refunds),
 *                      his cash-out requests made here, paid by the office.
 *   Stripe S710      - automatic payout: his TaxiCharg payout account.
 *
 * Nothing is copied or moved: the Clover side READS the Clover lines of the
 * one SYD CABS wallet. A SYD CABS driver's other wallet lines (jobs, charges,
 * platform fees) never show here and can never be cashed out here.
 *
 * Pure functions (no database) so they can be tested on their own.
 */

export function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

/** Which sides the person sees: from his ACTIVE terminals, by hardware. */
export function terminalView(terminals) {
  const active = (terminals || []).filter((t) => t && t.status === "active");
  const clover = active.some((t) => (t.brand || "clover") === "clover");
  const stripe = active.some((t) => t.brand === "stripe_s710");
  return { clover, stripe, none: !clover && !stripe };
}

function signed(e) {
  return (e.direction === "out" ? -1 : 1) * Number(e.amount || 0);
}

/** The Clover payment a FareTap wallet line belongs to (317 / 281 shapes). */
export function cloverPaymentKey(e) {
  const ref = String(e.external_ref || "");
  if (ref && !ref.includes(":")) return ref;                       // the takings line itself
  const m = /^(servicefee|commission|cardfee):(.+)$/.exec(ref);    // its fee / commission
  if (m) return m[2];
  return e.reference || null;                                      // refund lines carry the payment in reference
}

/**
 * One row per Clover payment, in the shape the pages already use:
 * fare (total), fee (Service fee), commission, refunded / refundAmount,
 * status settled | voided, net (what it put in his balance).
 * `entries` = wallet lines with source 'clover' (any kind, reversals included).
 */
export function cloverPaymentRows(entries, driverId) {
  const byId = new Map((entries || []).map((e) => [e.id, e]));
  const groups = new Map();
  const groupOf = (e) => {
    let key = e.reverses_id && byId.has(e.reverses_id) ? cloverPaymentKey(byId.get(e.reverses_id)) : cloverPaymentKey(e);
    if (!key) key = "line:" + e.id;
    if (!groups.has(key)) groups.set(key, { key, lines: [] });
    return groups.get(key);
  };
  for (const e of entries || []) groupOf(e).lines.push(e);

  const rows = [];
  for (const g of groups.values()) {
    const takings = g.lines.find((e) => e.kind === "takings" && !e.reverses_id);
    const reversed = new Set(g.lines.filter((e) => e.reverses_id).map((e) => e.reverses_id));
    const fee = g.lines.filter((e) => e.kind === "service_fee" && !e.reverses_id).reduce((a, e) => a + Number(e.amount), 0);
    const commission = g.lines.filter((e) => e.kind === "commission" && !e.reverses_id).reduce((a, e) => a + Number(e.amount), 0);
    const refund = g.lines.filter((e) => e.kind === "refund" && !e.reverses_id).reduce((a, e) => a + Number(e.amount), 0);
    const net = g.lines.reduce((a, e) => a + signed(e), 0);
    const first = takings || g.lines[0];
    const fare = takings ? Number(takings.amount) : 0;
    rows.push({
      id: first.id,
      driverId,
      date: new Date(first.entry_at).toISOString(),
      fare: round2(fare), tip: 0, total: round2(fare),
      method: "EFTPOS", card: null,
      status: takings && reversed.has(takings.id) ? "voided" : "settled",
      reason: null,
      voidReason: takings && reversed.has(takings.id) ? "Voided on the terminal" : null,
      fee: round2(fee), commission: round2(commission),
      refunded: refund > 0, refundAmount: round2(refund),
      net: round2(net),
      transactions: takings ? 1 : 0,
      note: takings ? null : (first.note || null),
      kind: "clover",
    });
  }
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * His Clover money.
 *  - A TaxiCharg terminal user (register role 'terminal'): his wallet holds
 *    nothing but TaxiCharg Clover money, so the Clover balance is the wallet.
 *  - Anyone else (a SYD CABS driver): only the Clover lines and the report
 *    lines count, less the cash-outs he asked for HERE that were paid.
 * What he can ask for now is never more than the wallet itself holds after
 * every open request (his SYD CABS app ones too) - so the same money can
 * never be asked for twice.
 */
export function cloverMoney({ role, walletBalance, cloverLines, reportLines, paidHere, pendingHere, pendingAll }) {
  const wallet = round2(walletBalance);
  let earned;
  if (role === "terminal") earned = wallet;
  else {
    const lines = [...(cloverLines || []), ...(reportLines || [])];
    earned = round2(lines.reduce((a, e) => a + signed(e), 0) - Number(paidHere || 0));
  }
  const available = round2(Math.max(0, Math.min(earned - Number(pendingHere || 0), wallet - Number(pendingAll || 0))));
  return { balance: round2(Math.max(0, earned)), available, pendingWithdrawals: round2(pendingHere) };
}

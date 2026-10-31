/**
 * The money of one card fare taken on a TaxiCharg S710 (tc-0015, 31 Oct 2026).
 * Pure: no database, no Stripe - so every number is checked on its own
 * (test/terminal-pay.test.mjs).
 *
 * The owner's decisions (31 Oct):
 *   - the passenger pays the fare plus the card surcharge (5%, the NSW cap,
 *     GST included), shown before the card is tapped and on the receipt;
 *   - the driver gets the fare plus his commission (1 / 1.5 / 2 % in his
 *     terms), and the commission comes out of the surcharge - never more
 *     than it; TaxiCharg keeps the rest of the surcharge, less Stripe's fee.
 *   Example: meter $100.00 -> card $105.00 -> driver on 1.5% gets $101.50.
 *
 * All amounts are whole cents. Rounding is half up, to the cent.
 */

/** The NSW cap on a taxi card surcharge (Passenger Transport (Fares) Order: 5% incl. GST). */
export const SURCHARGE_CAP_PCT = 5;
/** Smallest card fare (Stripe's AUD minimum is 50c; a taxi fare is never below $1). */
export const MIN_FARE_CENTS = 100;
/** Largest fare the meter may send: a guard against a broken frame, not a fare rule. */
export const MAX_METER_CENTS = 200000;

function intEnv(name, dflt) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : dflt;
}

/** The surcharge percentage in force: TC_CARD_SURCHARGE_PCT (default 5), never above the cap, never below 0. */
export function surchargePct() {
  const raw = process.env.TC_CARD_SURCHARGE_PCT;
  const v = raw === undefined || raw === "" ? SURCHARGE_CAP_PCT : Number(raw);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(SURCHARGE_CAP_PCT, Math.round(v * 100) / 100);
}

/** The largest typed amount (TC_TYPED_MAX_CENTS, default $500.00). */
export function typedMaxCents() {
  return Math.min(MAX_METER_CENTS, Math.round(intEnv("TC_TYPED_MAX_CENTS", 50000)));
}

const halfUp = (x) => Math.floor(x + 0.5 + 1e-9);

/**
 * Checks the amount the S710 asks to charge. `source` is 'meter' (the
 * meter's total at STOP, as the cab's tablet sent it) or 'typed'.
 * Returns { ok: true, fareCents } or { ok: false, error } in the words the
 * driver sees on the terminal.
 */
export function checkFare(source, fareCents) {
  if (source !== "meter" && source !== "typed") return { ok: false, error: "Unknown kind of payment." };
  const n = Number(fareCents);
  if (!Number.isInteger(n)) return { ok: false, error: "The amount is not a whole number of cents." };
  if (n < MIN_FARE_CENTS) return { ok: false, error: "The smallest card fare is $1.00." };
  const max = source === "typed" ? typedMaxCents() : MAX_METER_CENTS;
  if (n > max) {
    return { ok: false, error: source === "typed"
      ? `A typed amount can be at most $${(max / 100).toFixed(2)}. Use the meter for a bigger fare.`
      : "That meter amount is too large to take by card here." };
  }
  return { ok: true, fareCents: n };
}

/**
 * Splits one fare. `commissionRate` is the driver's terms (0.015 = 1.5%).
 * Returns every figure tc_card_payments stores (migration 320 checks the
 * same rules: amount = fare + surcharge; commission <= surcharge;
 * share = fare + commission).
 */
export function splitFare(fareCents, { pct = surchargePct(), commissionRate = 0 } = {}) {
  const fare = Math.round(Number(fareCents));
  const p = Math.max(0, Math.min(SURCHARGE_CAP_PCT, Number(pct) || 0));
  const surcharge = halfUp((fare * p) / 100);
  const rateWanted = Math.max(0, Number(commissionRate) || 0);
  // the rate kept on the record never claims more than the surcharge pays for
  const rate = Math.min(rateWanted, p / 100);
  const commission = Math.min(surcharge, halfUp(fare * rate));
  return {
    fareCents: fare,
    surchargePct: p,
    surchargeCents: surcharge,
    amountCents: fare + surcharge,
    commissionRate: Math.round(rate * 10000) / 10000,
    commissionCents: commission,
    driverShareCents: fare + commission,
    keptCents: surcharge - commission,
  };
}

/**
 * How much of the driver's share goes back when part (or all) of a paid
 * card fare is refunded: the same share of what he was sent as the share
 * of the card amount refunded, never more than is still with him.
 */
export function reversalFor({ amountCents, driverShareCents, reversedCents = 0 }, refundedCentsTotal) {
  const refunded = Math.max(0, Math.min(amountCents, Math.round(refundedCentsTotal)));
  const due = refunded >= amountCents ? driverShareCents : halfUp((driverShareCents * refunded) / amountCents);
  return Math.max(0, Math.min(driverShareCents - reversedCents, due - reversedCents));
}

export const dollars = (c) => `$${(Math.round(c) / 100).toFixed(2)}`;

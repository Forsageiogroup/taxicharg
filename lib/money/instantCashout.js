/**
 * Instant cash out (tc-0018, 31 Oct 2026). Pure: no Stripe, no database - every
 * figure is tested on its own (test/card-pages.test.mjs).
 *
 * The owner, 31 Oct: "there must be an instant cash out option rather than cash
 * available for couple of days". Asked: the driver pays Stripe's 1% (minimum
 * $0.50); the free 1-2 business day cash out stays beside it and he chooses
 * each time.
 *
 * How the money moves: Stripe Instant Payouts on HIS connected account. Card
 * fares can be paid out instantly as soon as the card is paid (Stripe's
 * balance.instant_available), arriving in his bank in about 30 minutes, any
 * day. Stripe charges TaxiCharg 1% of each instant payout; TaxiCharg takes the
 * same fee from his balance through Stripe's platform pricing (Dashboard ->
 * Connect -> Platform pricing -> Instant Payouts), so the fee shows on the
 * payout itself (application_fee_amount). He gets the amount he asked for in
 * his bank; the fee comes off his balance on top.
 *
 * Guard: the instant amount Stripe allows after the fee (instant_available
 * .net_available) must match OUR fee rule. If the fee is not set in Stripe
 * (net = gross), instant cash out stays off - TaxiCharg never pays it by
 * mistake and the driver is never shown a fee that is not the real one.
 *
 * Env (optional): TC_INSTANT_FEE_PCT (default 1, at most 5),
 * TC_INSTANT_FEE_MIN_CENTS (default 50), TC_INSTANT_DAY_MAX_CENTS (per driver
 * per Sydney day, default 100000 = $1,000: TaxiCharg carries refunds and
 * disputes on money already paid out), TC_INSTANT_CASHOUT=off switches it off.
 */

const num = (v, d) => (v == null || v === "" || !Number.isFinite(Number(v)) ? d : Number(v));

export function instantSettings(env = process.env) {
  return {
    on: String(env.TC_INSTANT_CASHOUT || "on").toLowerCase() !== "off",
    pct: Math.min(5, Math.max(0, num(env.TC_INSTANT_FEE_PCT, 1))),
    minCents: Math.max(0, Math.round(num(env.TC_INSTANT_FEE_MIN_CENTS, 50))),
    dayMaxCents: Math.max(0, Math.round(num(env.TC_INSTANT_DAY_MAX_CENTS, 100000))),
  };
}

/** Stripe's limits for one instant payout in AUD. */
export const STRIPE_INSTANT_MIN_CENTS = 50;
export const STRIPE_INSTANT_MAX_CENTS = 999900;
/** TaxiCharg's own smallest cash out (the same as the free one). */
export const CASHOUT_MIN_CENTS = 100;

/** The fee on an instant cash out of `cents` (what he gets in his bank). */
export function instantFeeCents(cents, s = instantSettings()) {
  if (!(cents > 0)) return 0;
  return Math.max(s.minCents, Math.round((cents * s.pct) / 100));
}

/** Sydney midnight (as a Unix time in seconds) of the day `nowMs` is in. */
export function sydneyDayStart(nowMs = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(nowMs)).map((p) => [p.type, p.value]));
  const sinceMidnight = (Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second)) * 1000 + (nowMs % 1000);
  return Math.floor((nowMs - sinceMidnight) / 1000);
}

/** His instant cash outs so far today (Sydney), in cents (failed or cancelled ones do not count). */
export function instantTodayCents(payouts, nowMs = Date.now()) {
  const from = sydneyDayStart(nowMs);
  return (payouts || [])
    .filter((p) => p.method === "instant" && p.created >= from && p.status !== "failed" && p.status !== "canceled")
    .reduce((a, p) => a + Number(p.amount || 0), 0);
}

/**
 * What he can take instantly now, from Stripe's balance object.
 * -> { on, maxCents, feeOnMaxCents, reason, pct, minFeeCents, dayLeftCents }
 * reason: null (he can) | "off" | "nothing" | "not_set_up" | "day_limit" | "too_small"
 */
export function instantView(balance, { todayCents = 0, settings = instantSettings() } = {}) {
  const base = { pct: settings.pct, minFeeCents: settings.minCents, dayLeftCents: Math.max(0, settings.dayMaxCents - todayCents) };
  if (!settings.on) return { ...base, on: false, maxCents: 0, feeOnMaxCents: 0, reason: "off" };
  const aud = (balance?.instant_available || []).filter((x) => x.currency === "aud");
  const gross = aud.reduce((a, x) => a + Number(x.amount || 0), 0);
  if (gross <= 0) return { ...base, on: true, maxCents: 0, feeOnMaxCents: 0, reason: "nothing" };
  const nets = aud.flatMap((x) => x.net_available || []).map((n) => Number(n.amount || 0));
  const net = nets.length ? Math.max(...nets) : gross;
  // the fee Stripe will take must be OUR fee (2 cents of rounding allowed)
  const stripeFee = gross - net;
  if (net <= 0 || Math.abs(stripeFee - instantFeeCents(net, settings)) > 2) return { ...base, on: false, maxCents: 0, feeOnMaxCents: 0, reason: "not_set_up" };
  const max = Math.min(net, base.dayLeftCents, STRIPE_INSTANT_MAX_CENTS);
  if (base.dayLeftCents < CASHOUT_MIN_CENTS) return { ...base, on: true, maxCents: 0, feeOnMaxCents: 0, reason: "day_limit" };
  if (max < Math.max(CASHOUT_MIN_CENTS, STRIPE_INSTANT_MIN_CENTS)) return { ...base, on: true, maxCents: 0, feeOnMaxCents: 0, reason: "too_small" };
  return { ...base, on: true, maxCents: max, feeOnMaxCents: instantFeeCents(max, settings), reason: null };
}

/** The words for a reason he cannot cash out instantly. */
export function instantReasonText(reason) {
  return {
    off: "Instant cash out is switched off. Use the free cash out.",
    nothing: "Nothing to cash out yet.",
    not_set_up: "Instant cash out is not ready yet - TaxiCharg is setting it up. Use the free cash out.",
    day_limit: "You have reached today's instant cash out limit. Use the free cash out, or try again tomorrow.",
    too_small: "The smallest instant cash out is $1.00.",
  }[reason] || null;
}

/**
 * An S710 driver's card money in one place (tc-0016, 31 Oct 2026) - used by
 * the website's pages and by /api/driver/card (the TaxiCharg phone app), so
 * both always show the same figures.
 *
 *   cardMoney(driver)        his card fares, his balance and his cash outs
 *   cashOut(driver, {...})   sends what he asks (at most what is available) to his bank
 *                            method "standard" (free, 1-2 business days) or "instant"
 *                            (about 30 minutes, fee 1% min $0.50 - tc-0018)
 */
import { stripeKeyProblem } from "@/lib/stripe";
import { getPayoutAccount } from "@/lib/data/stripeAccounts";
import { cardPaymentsForDriver } from "@/lib/data/terminalPay";
import { cardRows, balanceView, payoutView } from "@/lib/money/cardReport";
import { ensureManualPayouts, connectedBalance, listPayouts, createCashout, createInstantCashout, canTakeInstant } from "@/lib/stripePayouts";
import { instantSettings, instantView, instantTodayCents, instantFeeCents, instantReasonText, CASHOUT_MIN_CENTS } from "@/lib/money/instantCashout";

/** Whether the card pages are his: an S710 is his now, or he has a payout account (money may still be in it). */
export function hasCardSide(driver, account) {
  return Boolean(driver?.view?.stripe || account?.account_id);
}

export async function cardMoney(driver, { stripe = true, limit = 500 } = {}) {
  const [account, raw] = await Promise.all([getPayoutAccount(driver.id), cardPaymentsForDriver(driver.id, limit)]);
  const out = {
    cardSide: hasCardSide(driver, account),
    account: account ? { status: account.status, ready: account.status === "ready", test: !account.livemode } : null,
    rows: cardRows(raw),
    balance: null,
    payouts: [],
    instant: null,
    stripeError: null,
  };
  if (!stripe || !account?.account_id || stripeKeyProblem()) return out;
  try { await ensureManualPayouts(account.account_id); } catch (err) { console.error("[card] manual payouts", err.message || err); }
  try {
    const [b, p, bankOk] = await Promise.all([connectedBalance(account.account_id), listPayouts(account.account_id, 20), canTakeInstant(account.account_id)]);
    out.balance = balanceView(b);
    out.payouts = p.map(payoutView);
    out.instant = instantForPage(b, p, bankOk);
  } catch (err) {
    console.error("[card] balance", err.message || err);
    out.stripeError = "Your balance could not be read just now. Try again in a minute.";
  }
  return out;
}

/** The instant cash out as the pages and the app show it (dollars; never an account id). */
function instantForPage(balance, payouts, bankOk) {
  const v = instantView(balance, { todayCents: instantTodayCents(payouts) });
  const reason = v.reason || (bankOk === false ? "bank" : null);
  return {
    on: v.on && reason !== "bank",
    max: v.maxCents / 100,
    feeOnMax: v.feeOnMaxCents / 100,
    feePct: v.pct,
    feeMin: v.minFeeCents / 100,
    reason,
    note: reason === "bank" ? BANK_NO_INSTANT : instantReasonText(reason),
  };
}

const BANK_NO_INSTANT = "Your bank account cannot take instant cash outs. Use the free cash out, or ask TaxiCharg support to add a debit card.";

/** Stripe's refusals of an instant payout, in his words. */
function instantError(err) {
  const code = err?.code || err?.raw?.code || "";
  if (code === "instant_payouts_unsupported") return { status: 409, error: BANK_NO_INSTANT };
  if (code === "instant_payouts_limit_exceeded") return { status: 409, error: "Instant cash outs have reached today's limit. Use the free cash out, or try again tomorrow." };
  if (code === "instant_payouts_config_disabled" || code === "instant_payouts_currency_disabled") return { status: 409, error: instantReasonText("not_set_up") };
  if (code === "balance_insufficient") return { status: 400, error: "Not enough in your balance for that amount and the fee. Try a smaller amount." };
  return null;
}

export async function cashOut(driver, { requestId, amountCents, method }) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(requestId || ""))) return { status: 400, error: "Start the cash out again." };
  if (stripeKeyProblem()) return { status: 503, error: "Cash out is not switched on yet." };
  const account = await getPayoutAccount(driver.id);
  if (!account?.account_id) return { status: 409, error: "Open your payout account first." };
  if (account.status !== "ready") return { status: 409, error: "Your payout account is not ready. Open Payout account and finish it." };
  if (method === "instant") return instantCashOut(driver, account, { requestId, amountCents });
  if (method != null && method !== "standard") return { status: 400, error: "Choose Instant or Free." };
  const b = balanceView(await connectedBalance(account.account_id));
  const availableCents = Math.round(b.available * 100);
  if (availableCents <= 0) return { status: 400, error: "Nothing is available to cash out yet. Card fares become available after a couple of days." };
  const want = amountCents == null || amountCents === "" ? availableCents : Number(amountCents);
  if (!Number.isInteger(want) || want <= 0) return { status: 400, error: "Enter an amount." };
  if (want < 100) return { status: 400, error: "The smallest cash out is $1.00." };
  if (want > availableCents) return { status: 400, error: availableCents > 0 ? `Only $${b.available.toFixed(2)} is available to cash out now.` : "Nothing is available to cash out yet. Card fares become available after a couple of days." };
  try { await ensureManualPayouts(account.account_id); } catch (err) { console.error("[card] manual payouts", err.message || err); }
  try {
    const p = await createCashout(account.account_id, want, { requestId, driverId: driver.id });
    return { status: 200, payout: payoutView(p) };
  } catch (err) {
    console.error("[card] cash out", driver.id, err.message || err);
    return { status: 502, error: "The cash out could not be made. Try again, or contact TaxiCharg support." };
  }
}

/** tc-0018: instant - about 30 minutes, fee 1% (min $0.50) off his balance on top. Never more than Stripe and TaxiCharg allow. */
async function instantCashOut(driver, account, { requestId, amountCents }) {
  const s = instantSettings();
  if (!s.on) return { status: 409, error: instantReasonText("off") };
  const [raw, payouts] = await Promise.all([connectedBalance(account.account_id), listPayouts(account.account_id, 50)]);
  const v = instantView(raw, { todayCents: instantTodayCents(payouts), settings: s });
  if (v.reason) return { status: v.reason === "not_set_up" ? 409 : 400, error: instantReasonText(v.reason) };
  const want = amountCents == null || amountCents === "" ? v.maxCents : Number(amountCents);
  if (!Number.isInteger(want) || want <= 0) return { status: 400, error: "Enter an amount." };
  if (want < CASHOUT_MIN_CENTS) return { status: 400, error: "The smallest cash out is $1.00." };
  if (want > v.maxCents) return { status: 400, error: `Up to $${(v.maxCents / 100).toFixed(2)} can be cashed out instantly now (the fee comes on top).` };
  try { await ensureManualPayouts(account.account_id); } catch (err) { console.error("[card] manual payouts", err.message || err); }
  try {
    const p = await createInstantCashout(account.account_id, want, { requestId, driverId: driver.id });
    const view = payoutView(p);
    if (!p.application_fee_amount) view.fee = instantFeeCents(want, s) / 100;
    return { status: 200, payout: view };
  } catch (err) {
    console.error("[card] instant cash out", driver.id, err.code || "", err.message || err);
    return instantError(err) || { status: 502, error: "The instant cash out could not be made. Try the free cash out, or contact TaxiCharg support." };
  }
}

/**
 * An S710 driver's card money in one place (tc-0016, 31 Oct 2026) - used by
 * the website's pages and by /api/driver/card (the TaxiCharg phone app), so
 * both always show the same figures.
 *
 *   cardMoney(driver)        his card fares, his balance and his cash outs
 *   cashOut(driver, {...})   sends what he asks (at most what is available) to his bank
 */
import { stripeKeyProblem } from "@/lib/stripe";
import { getPayoutAccount } from "@/lib/data/stripeAccounts";
import { cardPaymentsForDriver } from "@/lib/data/terminalPay";
import { cardRows, balanceView, payoutView } from "@/lib/money/cardReport";
import { ensureManualPayouts, connectedBalance, listPayouts, createCashout } from "@/lib/stripePayouts";

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
    stripeError: null,
  };
  if (!stripe || !account?.account_id || stripeKeyProblem()) return out;
  try { await ensureManualPayouts(account.account_id); } catch (err) { console.error("[card] manual payouts", err.message || err); }
  try {
    const [b, p] = await Promise.all([connectedBalance(account.account_id), listPayouts(account.account_id, 20)]);
    out.balance = balanceView(b);
    out.payouts = p.map(payoutView);
  } catch (err) {
    console.error("[card] balance", err.message || err);
    out.stripeError = "Your balance could not be read just now. Try again in a minute.";
  }
  return out;
}

export async function cashOut(driver, { requestId, amountCents }) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(String(requestId || ""))) return { status: 400, error: "Start the cash out again." };
  if (stripeKeyProblem()) return { status: 503, error: "Cash out is not switched on yet." };
  const account = await getPayoutAccount(driver.id);
  if (!account?.account_id) return { status: 409, error: "Open your payout account first." };
  if (account.status !== "ready") return { status: 409, error: "Your payout account is not ready. Open Payout account and finish it." };
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

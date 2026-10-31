/**
 * The S710 driver's own money in his payout account (tc-0016, 31 Oct 2026). Server only.
 *
 * The owner, 31 Oct: an S710 driver presses Cash out each time - nothing goes
 * to his bank by itself. So his account is set to MANUAL payouts (Stripe's
 * balance settings, on his connected account), and a cash out is a payout he
 * asks for, from his own balance to the bank account he gave in the payout
 * account form. TaxiCharg never holds this money: it is already his (his
 * share is sent to him after each fare, tc-0015).
 */
import { getStripeClient } from "@/lib/stripe";

const manualDone = new Set();

/** Payouts happen only when he asks. Safe to call again (the same setting). */
export async function ensureManualPayouts(accountId) {
  if (manualDone.has(accountId)) return;
  await getStripeClient().balanceSettings.update(
    { payments: { payouts: { schedule: { interval: "manual" } } } },
    { stripeAccount: accountId },
  );
  manualDone.add(accountId);
}

export async function connectedBalance(accountId) {
  return getStripeClient().balance.retrieve({}, { stripeAccount: accountId });
}

export async function listPayouts(accountId, limit = 20) {
  const r = await getStripeClient().payouts.list({ limit }, { stripeAccount: accountId });
  return r?.data || [];
}

/** One cash out, once per press (idempotency key from the page's own request id). */
export async function createCashout(accountId, amountCents, { requestId, driverId }) {
  return getStripeClient().payouts.create(
    { amount: amountCents, currency: "aud", description: "TaxiCharg cash out", metadata: { driver_id: driverId, source: "taxicharg" } },
    { stripeAccount: accountId, idempotencyKey: `tccash_${requestId}` },
  );
}

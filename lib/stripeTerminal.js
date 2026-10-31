/**
 * Stripe Terminal for the TaxiCharg S710 (tc-0015, 31 Oct 2026). Server only.
 *
 * Will's v4 design ("separate charges and transfers"):
 *   1. TaxiCharg charges the card on the S710 (TaxiCharg is the merchant of
 *      record): a card_present PaymentIntent for the fare + card surcharge.
 *   2. When Stripe says it succeeded, the driver's share is transferred to
 *      his own payout account (318) - tied to that charge (source_transaction,
 *      so it moves only with the money that came in) and made at most once
 *      (idempotency key transfer_<payment intent>).
 *   3. A refund or a dispute takes the share back (a transfer reversal).
 *
 * Every call goes through getStripeClient(), so a live key on a staging site
 * is refused exactly as for the payout accounts (lib/stripe.js).
 */
import { getStripeClient } from "@/lib/stripe";

const readerLocation = new Map();   // tmr_ -> tml_ (a reader's location never changes under us mid-shift)

/**
 * A connection token for the S710 app, limited to the reader's own location.
 * (Apps on Devices can also take its token from the reader itself; that path
 * is refused for an app installed by cable on a DevKit, so the token comes
 * from here - the standard Terminal way.)
 */
export async function connectionTokenFor(readerId) {
  const stripe = getStripeClient();
  let location = readerLocation.get(readerId);
  if (location === undefined) {
    try {
      const r = await stripe.terminal.readers.retrieve(readerId);
      location = typeof r.location === "string" ? r.location : r.location?.id || null;
    } catch (err) {
      console.error("[terminal] reader lookup", readerId, err.message || err);
      location = null;
    }
    if (location) readerLocation.set(readerId, location);
  }
  // never a token for the whole account: only for this reader's own location
  if (!location) throw Object.assign(new Error("The card reader is not registered to a location in Stripe."), { noLocation: true });
  const t = await stripe.terminal.connectionTokens.create({ location });
  return t.secret;
}

/** The PaymentIntent for one card fare, made once per press (idempotency key from the app's own request id). */
export async function createFareIntent(row) {
  return getStripeClient().paymentIntents.create({
    amount: row.amount_cents,
    currency: "aud",
    payment_method_types: ["card_present"],
    capture_method: "automatic",
    transfer_group: `tcpay_${row.id}`,
    description: row.source === "meter" ? "TaxiCharg taxi fare (meter)" : "TaxiCharg taxi fare",
    metadata: {
      tc_payment_id: row.id,
      source: row.source,
      fare_cents: String(row.fare_cents),
      surcharge_cents: String(row.surcharge_cents),
      driver_share_cents: String(row.driver_share_cents),
      driver_id: row.driver_id,
      terminal_id: row.terminal_id,
      reader_id: row.reader_id,
      meter_trip_id: row.meter_trip_id || "",
    },
  }, { idempotencyKey: `tcpi_${row.request_id}` });
}

export async function retrieveIntent(piId) {
  return getStripeClient().paymentIntents.retrieve(piId, { expand: ["latest_charge"] });
}

export async function cancelIntent(piId) {
  return getStripeClient().paymentIntents.cancel(piId);
}

export async function retrieveCharge(chargeId) {
  return getStripeClient().charges.retrieve(chargeId);
}

/**
 * The driver's share, sent once per payment. A transfer already made for this
 * payment (its transfer group) is taken as it is - so a send whose answer was
 * lost is never made again, even after Stripe forgets the idempotency key (24 h).
 */
export async function sendShareTransfer(row) {
  const stripe = getStripeClient();
  const had = await stripe.transfers.list({ transfer_group: `tcpay_${row.id}`, limit: 10 });
  const mine = (had?.data || []).find((t) => t.destination === row.account_id);
  if (mine) return mine;
  return stripe.transfers.create({
    amount: row.driver_share_cents,
    currency: "aud",
    destination: row.account_id,
    source_transaction: row.charge_id,
    transfer_group: `tcpay_${row.id}`,
    description: "TaxiCharg card fare - your share",
    metadata: { tc_payment_id: row.id, fare_cents: String(row.fare_cents), commission_cents: String(row.commission_cents) },
  }, { idempotencyKey: `transfer_${row.payment_intent_id}` });
}

export async function retrieveTransfer(trId) {
  return getStripeClient().transfers.retrieve(trId);
}

export async function retrieveDispute(dpId) {
  return getStripeClient().disputes.retrieve(dpId);
}

/** Takes back `amount` cents of a transfer; the key makes a repeat of the same step a no-op. */
export async function reverseShare(transferId, amount, key) {
  return getStripeClient().transfers.createReversal(transferId, { amount, metadata: { reason: key } }, { idempotencyKey: `rev_${key}` });
}

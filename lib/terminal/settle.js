/**
 * What happens to an S710 card payment after the card is tapped (tc-0015).
 * Stripe is always asked again - an app's word or a webhook's body is never
 * taken as the truth about money.
 *
 *   syncIntent(row)      reads the PaymentIntent from Stripe and records its
 *                        status, card and charge; when it has succeeded, sends
 *                        the driver's share.
 *   stopPayment(row)     cancels a payment that was not finished - and records
 *                        it as cancelled ONLY when Stripe says it is cancelled
 *                        (a card being read, or already paid, is never lost).
 *   sendShare(row)       the transfer to his payout account - once, by one caller.
 *   applyRefunds(row)    reads the charge: refunded / disputed; takes back the
 *                        same part of his share (by Stripe's own reversed figure).
 *   disputeClosed(row)   a dispute TaxiCharg won: the office is told, to decide
 *                        whether his share goes back to him.
 */
import { reversalFor } from "@/lib/money/cardFare";
import {
  retrieveIntent, retrieveCharge, cancelIntent, sendShareTransfer, retrieveTransfer, reverseShare, retrieveDispute,
} from "@/lib/stripeTerminal";
import { updatePayment, paymentById, claimTransfer } from "@/lib/data/terminalPay";

const STATUS = { succeeded: "succeeded", processing: "processing", canceled: "canceled" };

function cardOf(charge) {
  const d = charge?.payment_method_details;
  const c = d?.card_present || d?.interac_present || d?.card || null;
  if (!c) return {};
  return { card_brand: c.brand ? String(c.brand).slice(0, 20) : null, card_last4: /^[0-9]{4}$/.test(c.last4 || "") ? c.last4 : null };
}

export async function syncIntent(row, pi = null) {
  if (!row?.payment_intent_id) return row;
  const intent = pi && pi.id === row.payment_intent_id && pi.latest_charge && typeof pi.latest_charge === "object" ? pi : await retrieveIntent(row.payment_intent_id);
  if (Number(intent.amount) !== Number(row.amount_cents)) {
    // never happens through our own code: a PaymentIntent with another amount is not this fare
    console.error("[terminal] amount mismatch", row.id, intent.amount, row.amount_cents);
    return updatePayment(row.id, { failure_message: `Stripe holds ${intent.amount} cents, the record ${row.amount_cents}. Office to check.` });
  }
  const charge = intent.latest_charge && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const patch = {};
  const next = STATUS[intent.status] || "created";
  // money taken is always recorded; a paid fare never goes back; a cancelled one only moves on to paid
  if (row.status !== "succeeded" && (row.status !== "canceled" || next === "succeeded") && next !== row.status) patch.status = next;
  if (charge?.id && charge.id !== row.charge_id) { patch.charge_id = charge.id; Object.assign(patch, cardOf(charge)); }
  if (next === "succeeded" && !row.succeeded_at) patch.succeeded_at = new Date().toISOString();
  if (intent.last_payment_error?.message && next !== "succeeded") patch.failure_message = String(intent.last_payment_error.message).slice(0, 300);
  if (charge && Number(charge.amount_refunded) > Number(row.refunded_cents || 0)) patch.refunded_cents = Math.min(Number(charge.amount_refunded), row.amount_cents);
  if (charge?.disputed && !row.disputed) patch.disputed = true;
  let out = Object.keys(patch).length ? await updatePayment(row.id, patch) : row;
  if (out.status === "succeeded") {
    if (!["sent", "reversed", "partly_reversed"].includes(out.transfer_status)) out = await sendShare(out);
    if (out.refunded_cents > 0 || out.disputed) out = await settleTakeBacks(out);
  }
  return out;
}

/**
 * Stops a payment that was not finished (the passenger cancelled, the driver
 * gave up, a new press replaced it, the daily check found it abandoned). It is
 * recorded as cancelled only when Stripe answers that it is cancelled; if the
 * card was taken meanwhile it is recorded as paid; while a card is still being
 * read it stays as it is.
 */
export async function stopPayment(row, message) {
  if (!row) return row;
  if (!row.payment_intent_id) {
    // never reached Stripe (the PaymentIntent was not made, or its id was not kept): nothing to cancel there
    return row.status === "created" ? updatePayment(row.id, { status: "canceled", failure_message: String(message || "Stopped.").slice(0, 300) }) : row;
  }
  let pi = null;
  try { pi = await cancelIntent(row.payment_intent_id); }
  catch (e) { console.warn("[terminal] cancel", row.id, e.message || e); }
  if (!pi || pi.status !== "canceled") return syncIntent(row);        // being read, or paid: Stripe's word stands
  return updatePayment(row.id, { status: "canceled", failure_message: String(message || "Stopped.").slice(0, 300) });
}

export async function sendShare(given) {
  const fresh = (await paymentById(given.id)) || given;
  if (fresh.status !== "succeeded" || !fresh.charge_id) return fresh;
  if (fresh.transfer_id) {
    // a transfer is on record: whatever the status says, it was sent
    return ["sent", "reversed", "partly_reversed"].includes(fresh.transfer_status)
      ? fresh : updatePayment(fresh.id, { transfer_status: "sent", transfer_error: null });
  }
  if (fresh.refunded_cents > 0 || fresh.disputed) {
    // refunded or disputed before his share left: nothing is sent; the office decides
    return fresh.transfer_status === "failed" && fresh.transfer_attempts >= 10 ? fresh
      : updatePayment(fresh.id, { transfer_status: "failed", transfer_error: "Refunded or disputed before the share was sent - not sent. Office to check.", transfer_attempts: 10 });
  }
  // only one caller sends: the row moves to 'sending' only if nobody else has. A 'sending' left
  // half-way (the daily check) is sent again - Stripe gives back the same transfer if it was made.
  const row = fresh.transfer_status === "sending" ? fresh : await claimTransfer(fresh.id);
  if (!row) return (await paymentById(fresh.id)) || fresh;
  try {
    const tr = await sendShareTransfer(row);
    return updatePayment(row.id, { transfer_id: tr.id, transfer_status: "sent", transfer_error: null, transferred_at: new Date().toISOString(), transfer_attempts: (row.transfer_attempts || 0) + 1 });
  } catch (err) {
    console.error("[terminal] transfer", row.id, err.message || err);
    return updatePayment(row.id, { transfer_status: "failed", transfer_error: String(err.message || err).slice(0, 300), transfer_attempts: (row.transfer_attempts || 0) + 1 });
  }
}

/** Takes back what a refund or a dispute says is no longer his - counted from Stripe's own figure. */
async function settleTakeBacks(row) {
  if (!row.transfer_id) return row;
  const target = Math.min(row.driver_share_cents, row.disputed
    ? row.driver_share_cents
    : reversalFor({ amountCents: row.amount_cents, driverShareCents: row.driver_share_cents, reversedCents: 0 }, row.refunded_cents));
  let already;
  try {
    already = Number((await retrieveTransfer(row.transfer_id)).amount_reversed || 0);
  } catch (err) {
    console.error("[terminal] transfer read", row.id, err.message || err);
    return updatePayment(row.id, { transfer_error: `Could not read the transfer to take back: ${String(err.message || err).slice(0, 200)}` });
  }
  let reversed = already;
  if (target > already) {
    try {
      await reverseShare(row.transfer_id, target - already, `${row.id}_${target}`);
      reversed = target;
    } catch (err) {
      console.error("[terminal] reversal", row.id, err.message || err);
      return updatePayment(row.id, { reversed_cents: already, transfer_error: `Take-back of ${target - already} cents failed: ${String(err.message || err).slice(0, 200)}` });
    }
  }
  const status = reversed >= row.driver_share_cents ? "reversed" : reversed > 0 ? "partly_reversed" : "sent";
  if (reversed === row.reversed_cents && status === row.transfer_status) return row;
  return updatePayment(row.id, { reversed_cents: reversed, transfer_status: status, transfer_error: null });
}

export async function applyRefunds(row) {
  if (!row?.charge_id) return row;
  const ch = await retrieveCharge(row.charge_id);
  const refunded = Math.min(Number(ch.amount_refunded || 0), row.amount_cents);
  const out = await updatePayment(row.id, {
    refunded_cents: Math.max(refunded, row.refunded_cents),
    disputed: Boolean(ch.disputed) || row.disputed,
    refund_checked_at: new Date().toISOString(),
  });
  return out.status === "succeeded" && (out.refunded_cents > 0 || out.disputed) ? settleTakeBacks(out) : out;
}

export async function applyDispute(row) {
  if (!row) return row;
  const out = row.disputed ? row : await updatePayment(row.id, { disputed: true });
  return settleTakeBacks(out);
}

/** A closed dispute: when TaxiCharg won it, the office is told (his share is not sent back by itself). */
export async function disputeClosed(row, disputeId) {
  if (!row || !disputeId) return row;
  const dp = await retrieveDispute(disputeId);
  if (dp.status !== "won") return row;
  return updatePayment(row.id, { transfer_error: `Dispute ${disputeId} won - the driver's share (${row.reversed_cents} cents taken back) can be paid to him again. Office to decide.` });
}

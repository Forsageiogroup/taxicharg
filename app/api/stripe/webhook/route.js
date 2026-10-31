import { NextResponse } from "next/server";
import { constructWebhookEvent, isStripeConfigured, retrieveDriverAccount, summariseAccount } from "@/lib/stripe";
import { findPayoutAccountByStripeId, saveAccountStatus } from "@/lib/data/stripeAccounts";
import { claimEvent, eventHandled, paymentByIntent, paymentByCharge, paymentById } from "@/lib/data/terminalPay";
import { syncIntent, applyRefunds, applyDispute, disputeClosed } from "@/lib/terminal/settle";

/** tc-0015: the S710 card payment an event is about - by its PaymentIntent, its charge, or our own id. */
async function paymentFor(obj) {
  if (!obj) return null;
  if (obj.object === "payment_intent") return (await paymentByIntent(obj.id)) || (obj.metadata?.tc_payment_id ? await paymentById(obj.metadata.tc_payment_id) : null);
  if (obj.object === "charge") return (await paymentByCharge(obj.id)) || (typeof obj.payment_intent === "string" ? await paymentByIntent(obj.payment_intent) : null);
  if (obj.object === "dispute") return (typeof obj.charge === "string" ? await paymentByCharge(obj.charge) : null) || (typeof obj.payment_intent === "string" ? await paymentByIntent(obj.payment_intent) : null);
  return null;
}

/**
 * Stripe webhook receiver. Point your Stripe webhook endpoint at
 * https://<your-domain>/api/stripe/webhook and set STRIPE_WEBHOOK_SECRET.
 *
 * Handle whichever events matter to you — account.updated (onboarding
 * status changes), transfer.created / payout.paid (money movement),
 * charge.succeeded (a fare was paid), etc.
 */
export async function POST(request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event;
  try {
    event = await constructWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err.message);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "account.updated": {
      // tc-0012: a driver's payout account changed (details checked, a
      // capability switched on or off). The event only says WHICH account;
      // its state is read again from Stripe, never taken from the event.
      const accountId = event.account || event.data?.object?.id;
      const row = accountId ? await findPayoutAccountByStripeId(accountId) : null;
      if (row) {
        try {
          await saveAccountStatus(row, summariseAccount(await retrieveDriverAccount(accountId)));
        } catch (err) {
          console.error("[stripe webhook] account.updated refresh", accountId, err.message || err);
          return NextResponse.json({ error: "Try again." }, { status: 500 }); // Stripe retries
        }
      }
      break;
    }
    // tc-0015: S710 card fares. Each event only says WHICH payment; Stripe is asked again for the facts.
    // An event is handled once (tc_stripe_events); a failure answers 500 so Stripe sends it again.
    case "payment_intent.succeeded":
    case "payment_intent.processing":
    case "payment_intent.canceled":
    case "payment_intent.payment_failed":
    case "charge.refunded":
    case "charge.refund.updated":
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      const raw = event.data?.object;
      const obj = raw?.object === "refund" && typeof raw.charge === "string" ? { object: "charge", id: raw.charge, payment_intent: raw.payment_intent } : raw;
      try {
        const row = await paymentFor(obj);   // a database error answers 500, so Stripe sends the event again
        if (!row) break;                     // not an S710 fare (or not ours)
        if (!(await claimEvent(event))) break;
        if (event.type.startsWith("payment_intent.")) await syncIntent(row);
        else if (event.type === "charge.dispute.created") await applyDispute(await syncIntent(row));
        else if (event.type === "charge.dispute.closed") await disputeClosed(await applyRefunds(await syncIntent(row)), raw?.id);
        else await applyRefunds(await syncIntent(row));
        await eventHandled(event.id, event.type);
      } catch (err) {
        console.error("[stripe webhook]", event.type, obj?.id, err.message || err);
        return NextResponse.json({ error: "Try again." }, { status: 500 });
      }
      break;
    }
    case "transfer.created":
    case "payout.paid":
      console.log(`[stripe webhook] ${event.type}`, event.data.object.id);
      break;
    default:
      console.log(`[stripe webhook] unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

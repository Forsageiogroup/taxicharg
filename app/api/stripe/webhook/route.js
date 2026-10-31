import { NextResponse } from "next/server";
import { constructWebhookEvent, isStripeConfigured, retrieveDriverAccount, summariseAccount } from "@/lib/stripe";
import { findPayoutAccountByStripeId, saveAccountStatus } from "@/lib/data/stripeAccounts";

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
    case "transfer.created":
    case "payout.paid":
      console.log(`[stripe webhook] ${event.type}`, event.data.object.id);
      break;
    default:
      console.log(`[stripe webhook] unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

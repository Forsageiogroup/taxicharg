import { NextResponse } from "next/server";
import { constructWebhookEvent, isStripeConfigured } from "@/lib/stripe";

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
    case "account.updated":
      // TODO: look up the driver by event.data.object.id (Stripe account
      // id) and sync payoutsEnabled / detailsSubmitted onto their record.
      console.log("[stripe webhook] account.updated", event.data.object.id);
      break;
    case "transfer.created":
    case "payout.paid":
      console.log(`[stripe webhook] ${event.type}`, event.data.object.id);
      break;
    default:
      console.log(`[stripe webhook] unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

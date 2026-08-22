import Stripe from "stripe";

/**
 * Stripe Connect helper.
 *
 * Env vars (set these in Vercel → Project Settings → Environment Variables,
 * and in a local .env.local for development — see .env.example):
 *   STRIPE_SECRET_KEY        — sk_test_... / sk_live_...
 *   STRIPE_WEBHOOK_SECRET    — whsec_... (from the Stripe CLI or Dashboard webhook)
 *   NEXT_PUBLIC_APP_URL      — e.g. https://taxicharg.vercel.app (used for redirect URLs)
 *
 * Until STRIPE_SECRET_KEY is set, every function here throws / the app
 * falls back to demo mode automatically (see the API routes that call
 * these helpers).
 */

let _stripe = null;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripeClient() {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  }
  return _stripe;
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Creates (or reuses) a Stripe Express connected account for a driver and
 * returns an onboarding link URL to redirect them to.
 */
export async function createOnboardingLink({ existingAccountId, driverEmail }) {
  const stripe = getStripeClient();

  let accountId = existingAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "AU",
      email: driverEmail,
      business_type: "individual",
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
    });
    accountId = account.id;
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl()}/dashboard/connect?stripe=refresh`,
    return_url: `${appUrl()}/api/stripe/callback?account=${accountId}`,
    type: "account_onboarding",
  });

  return { accountId, url: accountLink.url };
}

export async function getAccountStatus(accountId) {
  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(accountId);
  return {
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
  };
}

/**
 * Sends a driver's settled earnings to their connected Stripe account.
 * In a full production build the platform account collects fares via
 * Stripe Terminal / Checkout, then this transfer moves the driver's cut
 * out of the platform balance and into their own Stripe balance, ready
 * for their own bank payout schedule.
 */
export async function createPayout({ accountId, amount }) {
  const stripe = getStripeClient();
  const transfer = await stripe.transfers.create({
    amount: Math.round(amount * 100),
    currency: "aud",
    destination: accountId,
  });
  return { id: transfer.id, amount: transfer.amount / 100 };
}

export async function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

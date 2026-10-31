import Stripe from "stripe";

/**
 * Stripe for TaxiCharg (server only).
 *
 * 31 Oct 2026 (tc-0012): each driver gets his own TaxiCharg payout account -
 * a Stripe connected account made with the Accounts v2 API, as in Will's v4
 * plan: no Stripe dashboard for the driver, TaxiCharg pays the fees and
 * carries the losses, `merchant` + `recipient` configurations so S710 fares
 * can be transferred to him and he can withdraw (Instant Payouts later).
 * He fills in his details inside the TaxiCharg site (Stripe's onboarding
 * component, in TaxiCharg colours) - never on a Stripe page, never with a
 * Stripe login. The old Express demo (accounts.create type "express" and a
 * hosted Stripe link) is gone.
 *
 * Env (Vercel → taxicharg-staging only, while this is tested):
 *   STRIPE_SECRET_KEY                    sk_test_... (sandbox)
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY   pk_test_... (sandbox)
 *   STRIPE_WEBHOOK_SECRET                whsec_...   (optional for now)
 *
 * A live key (sk_live_) is refused unless TC_STRIPE_LIVE=yes is also set.
 * Nobody sets that on staging, so a live key put there by mistake does
 * nothing - it can never open real accounts against the staging database.
 */

let _stripe = null;

export function stripeKeyProblem() {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) return "not_configured";
  if (!/^(sk|rk)_(test|live)_/.test(key)) return "bad_key";
  if (key.includes("_live_") && process.env.TC_STRIPE_LIVE !== "yes") return "live_key_refused";
  const pub = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  if (!pub) return "no_publishable_key";
  if (key.includes("_test_") !== pub.includes("_test_")) return "keys_do_not_match";
  return null;
}

export function isStripeConfigured() {
  return stripeKeyProblem() === null;
}

export function getStripeClient() {
  const problem = stripeKeyProblem();
  if (problem) throw new Error(`Stripe is not available here (${problem}).`);
  // No apiVersion pin: the SDK's own version (needed for the v2 Accounts API).
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

/** The version of the TaxiCharg payout terms a driver accepts (shown on the page). */
export const PAYOUT_TERMS_VERSION = "tc-payout-terms-2026-10-31";

const INCLUDE = ["configuration.merchant", "configuration.recipient", "requirements"];

export function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { given_name: parts[0] || undefined, surname: undefined };
  return { given_name: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] };
}

/** The create call, built on its own so it can be checked without Stripe. */
export function driverAccountParams({ driver, acceptance }) {
  const name = splitName(driver.name);
  const individual = {};
  if (name.given_name) individual.given_name = name.given_name;
  if (name.surname) individual.surname = name.surname;
  if (driver.email) individual.email = driver.email;
  return {
    ...(driver.email ? { contact_email: driver.email } : {}),
    ...(driver.name ? { display_name: driver.name } : {}),
    dashboard: "none",
    identity: {
      country: "au",
      entity_type: "individual",
      individual,
      attestations: {
        terms_of_service: {
          account: {
            date: acceptance.at,
            ip: acceptance.ip,
            ...(acceptance.userAgent ? { user_agent: String(acceptance.userAgent).slice(0, 500) } : {}),
          },
        },
      },
    },
    defaults: {
      currency: "aud",
      locales: ["en-AU"],
      responsibilities: { fees_collector: "application", losses_collector: "application" },
    },
    configuration: {
      merchant: { capabilities: { card_payments: { requested: true } } },
      recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
    },
    metadata: { driver_id: driver.id, driver_ref: driver.driverId || "", source: "taxicharg" },
    include: INCLUDE,
  };
}

/**
 * Opens the driver's account. The terms acceptance (time, IP, browser) goes
 * in the same call - Stripe will not add the merchant configuration without
 * it. The idempotency key makes a double click (or a retry after a time-out)
 * return the same account instead of opening a second one.
 */
export async function createDriverAccount({ driver, acceptance }) {
  return getStripeClient().v2.core.accounts.create(driverAccountParams({ driver, acceptance }), {
    idempotencyKey: `tc-acct-${driver.id}-${PAYOUT_TERMS_VERSION}`,
  });
}

export async function retrieveDriverAccount(accountId) {
  return getStripeClient().v2.core.accounts.retrieve(accountId, { include: INCLUDE });
}

/**
 * What the TaxiCharg site needs from Stripe's answer. READY = he can be sent
 * money (transfers active) and can take it out (payouts active).
 */
export function summariseAccount(acct) {
  const m = acct?.configuration?.merchant?.capabilities || {};
  const r = acct?.configuration?.recipient?.capabilities || {};
  const transfers = r?.stripe_balance?.stripe_transfers?.status || null;
  const payouts = m?.stripe_balance?.payouts?.status || r?.stripe_balance?.payouts?.status || null;
  const cardPayments = m?.card_payments?.status || null;
  const due = Array.isArray(acct?.requirements?.entries) ? acct.requirements.entries.length : 0;
  let status = "onboarding";
  if (acct?.closed) status = "closed";
  else if (transfers === "active" && payouts === "active") status = "ready";
  else if (due === 0 && (transfers === "restricted" || payouts === "restricted")) status = "restricted";
  return { status, transfers, payouts, cardPayments, requirementsDue: due, livemode: Boolean(acct?.livemode) };
}

/**
 * A short-lived session for Stripe's components on the TaxiCharg pages.
 * The account comes from the driver's TaxiCharg login on the server, never
 * from the browser. Stripe's own login is switched off
 * (disable_stripe_user_authentication) - the TaxiCharg login is the login.
 * This step shows the details form, the account details and the "something
 * is needed" banner; balances and withdrawals come in a later step.
 */
export async function createDriverAccountSession(accountId) {
  const noStripeLogin = { external_account_collection: true, disable_stripe_user_authentication: true };
  const s = await getStripeClient().accountSessions.create({
    account: accountId,
    components: {
      account_onboarding: { enabled: true, features: noStripeLogin },
      account_management: { enabled: true, features: noStripeLogin },
      notification_banner: { enabled: true, features: noStripeLogin },
    },
  });
  return s.client_secret;
}

/**
 * tc-0015: two Stripe endpoints may send to /api/stripe/webhook - one for
 * TaxiCharg's own events (card fares: payment_intent.*, charge.*) and one for
 * the drivers' connected accounts (account.updated). Each has its own signing
 * secret: STRIPE_WEBHOOK_SECRET and STRIPE_CONNECT_WEBHOOK_SECRET. An event
 * signed by either is accepted; anything else is refused.
 */
export async function constructWebhookEvent(rawBody, signature) {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean);
  // none set: as before tc-0015 (Stripe refuses the event, the webhook answers 400)
  if (!secrets.length) return getStripeClient().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  let last;
  for (const s of secrets) {
    try { return getStripeClient().webhooks.constructEvent(rawBody, signature, s); } catch (err) { last = err; }
  }
  throw last;
}

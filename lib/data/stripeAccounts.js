/**
 * DATA LAYER - each driver's TaxiCharg payout account (migration 318,
 * tc_stripe_accounts). Server only: service_role, no browser access.
 */
import { db } from "@/lib/supabase";

const FIELDS = "id, driver_id, account_id, livemode, terms_version, terms_accepted_at, status, transfers_status, payouts_status, card_payments_status, requirements_due, last_checked_at, ready_at, created_at, updated_at";

function got(where, res) {
  if (res.error) console.error(`[stripeAccounts] ${where}:`, res.error.message || res.error);
  return res;
}

export function shape(row) {
  if (!row) return null;
  return {
    accountId: row.account_id,
    livemode: row.livemode,
    termsVersion: row.terms_version,
    termsAcceptedAt: row.terms_accepted_at,
    status: row.status,
    transfers: row.transfers_status,
    payouts: row.payouts_status,
    cardPayments: row.card_payments_status,
    requirementsDue: row.requirements_due,
    lastCheckedAt: row.last_checked_at,
    readyAt: row.ready_at,
  };
}

export async function getPayoutAccount(driverId) {
  const res = got("get", await db().from("tc_stripe_accounts").select(FIELDS).eq("driver_id", driverId).maybeSingle());
  if (res.error) throw new Error("The payout account record could not be read.");
  return res.data;
}

export async function findPayoutAccountByStripeId(accountId) {
  const res = got("byStripeId", await db().from("tc_stripe_accounts").select(FIELDS).eq("account_id", accountId).maybeSingle());
  return res.data || null;
}

/**
 * Keeps the account Stripe just opened. If a second request (a double
 * click) got there first, the row already exists for this driver: the
 * stored one is returned, and it holds the same account (same idempotency
 * key), so nothing is lost.
 */
export async function insertPayoutAccount(driverId, { accountId, livemode, acceptance, summary }) {
  const now = new Date().toISOString();
  const res = got("insert", await db().from("tc_stripe_accounts").insert({
    driver_id: driverId,
    account_id: accountId,
    livemode: Boolean(livemode),
    terms_version: acceptance.version,
    terms_accepted_at: acceptance.at,
    terms_ip: acceptance.ip || null,
    terms_user_agent: acceptance.userAgent ? String(acceptance.userAgent).slice(0, 500) : null,
    status: summary.status,
    transfers_status: summary.transfers,
    payouts_status: summary.payouts,
    card_payments_status: summary.cardPayments,
    requirements_due: summary.requirementsDue,
    last_checked_at: now,
    ready_at: summary.status === "ready" ? now : null,
  }).select(FIELDS).maybeSingle());
  if (res.error) {
    const again = await getPayoutAccount(driverId);
    if (again) return again;
    throw new Error("The payout account could not be saved.");
  }
  return res.data;
}

export async function saveAccountStatus(row, summary) {
  const now = new Date().toISOString();
  const patch = {
    status: summary.status,
    transfers_status: summary.transfers,
    payouts_status: summary.payouts,
    card_payments_status: summary.cardPayments,
    requirements_due: summary.requirementsDue,
    last_checked_at: now,
    updated_at: now,
  };
  if (summary.status === "ready" && !row.ready_at) patch.ready_at = now;
  const res = got("status", await db().from("tc_stripe_accounts").update(patch).eq("id", row.id).select(FIELDS).maybeSingle());
  return res.data || { ...row, ...patch };
}

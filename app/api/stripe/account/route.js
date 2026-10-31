import { NextResponse } from "next/server";
import { requireDriverSession } from "@/lib/driverSession";
import { clientIp, rateHit, tooMany } from "@/lib/protect";
import {
  PAYOUT_TERMS_VERSION,
  createDriverAccount,
  retrieveDriverAccount,
  stripeKeyProblem,
  summariseAccount,
} from "@/lib/stripe";
import { getPayoutAccount, insertPayoutAccount, saveAccountStatus, shape } from "@/lib/data/stripeAccounts";

/**
 * The driver's TaxiCharg payout account (tc-0012, 31 Oct 2026).
 *
 *   GET   → { configured, eligible, account }  - and asks Stripe for the
 *           latest state when he has one, so READY shows the moment it is
 *   POST  { accept: true, termsVersion } → opens the account
 *
 * Who may open one: a driver whose record is active. The office approves
 * drivers in the SYD CABS panel first; a pending or suspended record is
 * told to contact TaxiCharg. One account per driver (the database and the
 * idempotency key both hold that). The account id never comes from the
 * browser - always from his login.
 */

function refusal(problem) {
  if (problem === "live_key_refused") return "Payout accounts are switched off on this site (live key refused).";
  return "Payout accounts are not switched on yet. Contact TaxiCharg support.";
}

async function refreshed(row) {
  if (!row || !row.account_id) return row;
  try {
    const summary = summariseAccount(await retrieveDriverAccount(row.account_id));
    return await saveAccountStatus(row, summary);
  } catch (err) {
    console.error("[stripe account] refresh", err.message || err);
    return row; // show what we last knew; the page says when that was
  }
}

export async function GET() {
  const auth = await requireDriverSession();
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { driver } = auth;
  const problem = stripeKeyProblem();
  let row = null;
  try {
    row = await getPayoutAccount(driver.id);
  } catch {
    return NextResponse.json({ error: "Payout accounts are not available right now." }, { status: 503 });
  }
  if (row && !problem) row = await refreshed(row);
  return NextResponse.json({
    configured: !problem,
    eligible: driver.status === "active",
    termsVersion: PAYOUT_TERMS_VERSION,
    account: shape(row),
  });
}

export async function POST(request) {
  const auth = await requireDriverSession();
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { driver } = auth;

  const problem = stripeKeyProblem();
  if (problem) return NextResponse.json({ error: refusal(problem) }, { status: 503 });
  if (driver.status !== "active") {
    return NextResponse.json({ error: "Your TaxiCharg account must be approved first. Contact TaxiCharg support." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body?.accept !== true || body?.termsVersion !== PAYOUT_TERMS_VERSION) {
    return NextResponse.json({ error: "Please read and accept the payout terms first." }, { status: 400 });
  }

  const existing = await getPayoutAccount(driver.id).catch(() => undefined);
  if (existing === undefined) return NextResponse.json({ error: "Payout accounts are not available right now." }, { status: 503 });
  if (existing) return NextResponse.json({ ok: true, account: shape(await refreshed(existing)) });

  if (!(await rateHit(`payout-account:${driver.id}`, 5, 3600))) {
    return tooMany("Too many tries. Please wait an hour, or contact TaxiCharg support.");
  }

  const ip = clientIp(request);
  if (!ip || ip === "unknown") {
    return NextResponse.json({ error: "We could not record where you accepted the terms from. Please try again." }, { status: 400 });
  }
  const acceptance = {
    version: PAYOUT_TERMS_VERSION,
    at: new Date().toISOString(),
    ip,
    userAgent: request.headers.get("user-agent") || "",
  };

  try {
    const acct = await createDriverAccount({ driver, acceptance });
    const summary = summariseAccount(acct);
    const row = await insertPayoutAccount(driver.id, { accountId: acct.id, livemode: acct.livemode, acceptance, summary });
    return NextResponse.json({ ok: true, account: shape(row) });
  } catch (err) {
    console.error("[stripe account] create", err?.type || "", err?.code || "", err?.message || err);
    return NextResponse.json({ error: "Your payout account could not be opened just now. Please try again in a few minutes." }, { status: 502 });
  }
}

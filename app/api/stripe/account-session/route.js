import { NextResponse } from "next/server";
import { requireDriverSession } from "@/lib/driverSession";
import { rateHit, tooMany } from "@/lib/protect";
import { createDriverAccountSession, isStripeConfigured } from "@/lib/stripe";
import { getPayoutAccount } from "@/lib/data/stripeAccounts";

/**
 * A fresh, short-lived session for the payout-account form on the TaxiCharg
 * page (tc-0012). Called by the page whenever the form needs one. The
 * account is the signed-in driver's own, read from the database - never
 * taken from the request.
 */
export async function POST() {
  const auth = await requireDriverSession();
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!isStripeConfigured()) return NextResponse.json({ error: "Not available." }, { status: 503 });
  if (!(await rateHit(`payout-session:${auth.driver.id}`, 30, 900))) return tooMany("Please wait a few minutes and try again.");

  const row = await getPayoutAccount(auth.driver.id).catch(() => null);
  if (!row || !row.account_id) return NextResponse.json({ error: "No payout account yet." }, { status: 404 });
  if (row.status === "closed") return NextResponse.json({ error: "This payout account is closed." }, { status: 409 });

  try {
    const clientSecret = await createDriverAccountSession(row.account_id);
    return NextResponse.json({ client_secret: clientSecret });
  } catch (err) {
    console.error("[stripe account-session]", err?.code || "", err?.message || err);
    return NextResponse.json({ error: "The form could not be loaded. Please try again." }, { status: 502 });
  }
}

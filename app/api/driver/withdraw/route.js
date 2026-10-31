import { NextResponse } from "next/server";
import { requireDriverSession } from "@/lib/driverSession";
import { getDriverSummary } from "@/lib/data/payments";
import { recordWithdrawal } from "@/lib/data/withdrawals";

export async function POST(request) {
  const auth = await requireDriverSession();
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { driver } = auth;
  // tc-0013: cashing out here is the Clover side - only while a Clover terminal is his
  if (!driver.view || !driver.view.clover) {
    return NextResponse.json({ error: "You don't have a Clover terminal assigned. Contact TaxiCharg support." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }

  const summary = await getDriverSummary(driver.id);

  if (amount > summary.availableBalance + 0.01) {
    return NextResponse.json({ error: "Amount exceeds your available Clover balance." }, { status: 400 });
  }

  // tc-0012 (31 Oct 2026): the old "connected Stripe" path is gone. It sent
  // wallet money (Clover fares) straight out as a Stripe transfer, with no
  // check that the fares behind it were still good (no void / refund
  // re-read). Wallet withdrawals go to the office's payout queue, as before,
  // where the panel's Pay re-checks first. S710 fares go to the driver's own
  // TaxiCharg payout account instead (Stripe), not through this wallet.
  const req = await recordWithdrawal(driver.id, { amount, status: "processing" });

  return NextResponse.json({
    ok: true,
    mode: "office",
    payout: {
      id: req ? req.id : null,
      amount,
      arrivalEstimate: "1-2 business days",
    },
  });
}

import { NextResponse } from "next/server";
import { requireDriverSession } from "@/lib/driverSession";
import { getDriverSummary } from "@/lib/data/payments";
import { createPayout, isStripeConfigured } from "@/lib/stripe";
import { recordWithdrawal } from "@/lib/data/withdrawals";

export async function POST(request) {
  const auth = await requireDriverSession();
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { driver } = auth;

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }

  const summary = await getDriverSummary(driver.id);

  if (amount > summary.availableBalance + 0.01) {
    return NextResponse.json({ error: "Amount exceeds your available balance." }, { status: 400 });
  }

  // Real payout path: only runs once the driver has connected Stripe AND
  // the server has real Stripe keys configured. Otherwise we simulate a
  // successful withdrawal so the flow can be demoed end-to-end.
  if (driver.connections.stripe.connected && isStripeConfigured()) {
    try {
      const payout = await createPayout({
        accountId: driver.connections.stripe.accountId,
        amount,
      });
      await recordWithdrawal(driver.id, { amount, status: "processing" });
      return NextResponse.json({ ok: true, mode: "live", payout });
    } catch (err) {
      return NextResponse.json({ error: err.message || "Payout failed." }, { status: 502 });
    }
  }

  await recordWithdrawal(driver.id, { amount, status: "processing" });

  return NextResponse.json({
    ok: true,
    mode: "demo",
    payout: {
      id: `demo_payout_${Date.now()}`,
      amount,
      arrivalEstimate: "1-2 business days",
    },
  });
}

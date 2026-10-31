import { NextResponse } from "next/server";
import { stripeKeyProblem } from "@/lib/stripe";
import { syncIntent, sendShare, stopPayment, applyRefunds } from "@/lib/terminal/settle";
import { paymentsToSweep } from "@/lib/data/terminalPay";

/**
 * The daily check for S710 card fares (tc-0015; Will's v4: "daily sweep for
 * missed transfers"). Run by Vercel Cron (vercel.json), which sends
 * Authorization: Bearer <CRON_SECRET>. Without CRON_SECRET set it does nothing.
 *
 *   - a paid fare whose share was not sent (a webhook missed, Stripe busy, a
 *     send left half-way): sent now - never twice (a transfer already made for
 *     the payment is found and kept);
 *   - a payment left half-way for over 10 minutes (the app was closed): Stripe
 *     is asked; paid -> recorded and the share sent; still waiting for a card
 *     after 30 minutes -> cancelled (recorded only when Stripe confirms);
 *   - paid fares of the last 60 days, least recently checked first: Stripe is
 *     asked about refunds and disputes, in case a webhook was missed.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  if (stripeKeyProblem()) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });

  const { toSend, stuck, toCheck } = await paymentsToSweep(100);
  const out = { sent: 0, failed: 0, settled: 0, cancelled: 0, checked: 0 };
  for (const row of stuck) {
    try {
      let now = await syncIntent(row);
      if (now.status === "created" && Date.now() - new Date(now.created_at).getTime() > 30 * 60 * 1000) {
        now = await stopPayment(now, "Never finished on the terminal - cancelled by the daily check.");
        if (now.status === "canceled") out.cancelled++;
      }
      if (now.status === "succeeded") out.settled++;
    } catch (err) { console.error("[sweep] stuck", row.id, err.message || err); }
  }
  for (const row of toSend) {
    try {
      const now = await sendShare(row);
      if (now.transfer_status === "sent") out.sent++; else out.failed++;
    } catch (err) { out.failed++; console.error("[sweep] send", row.id, err.message || err); }
  }
  for (const row of toCheck) {
    try { await applyRefunds(row); out.checked++; } catch (err) { console.error("[sweep] refunds", row.id, err.message || err); }
  }
  return NextResponse.json({ ok: true, ...out });
}

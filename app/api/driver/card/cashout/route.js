import { NextResponse } from "next/server";
import { driverFromRequest } from "@/lib/driverAuth";
import { rateHit, tooMany } from "@/lib/protect";
import { cashOut } from "@/lib/terminal/cardMoney";

/**
 * tc-0016: Cash out - the driver sends money from his own payout account to
 * his bank (the owner, 31 Oct: he presses Cash out each time). Body:
 * { requestId, amountCents? } - no amount = everything available.
 */
export async function POST(request) {
  const driver = await driverFromRequest(request);
  if (!driver) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (driver.status !== "active") return NextResponse.json({ error: "Your account is not active. Contact TaxiCharg support." }, { status: 403 });
  if (!(await rateHit(`tc-cashout:${driver.id}`, 10, 3600))) return tooMany("Too many cash outs in an hour. Try again later.");
  let body = {};
  try { body = await request.json(); } catch {}
  const r = await cashOut(driver, { requestId: body.requestId, amountCents: body.amountCents });
  return NextResponse.json(r.error ? { error: r.error } : { ok: true, payout: r.payout }, { status: r.status });
}

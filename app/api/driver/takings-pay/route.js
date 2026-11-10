import { NextResponse } from "next/server";
import { driverFromRequest } from "@/lib/driverAuth";
import { rateHit, tooMany } from "@/lib/protect";
import { cashOut } from "@/lib/terminal/cardMoney";
import { sendToCard, driverCardOn } from "@/lib/driverCard";
import { reportShare, reportPay, reportPayDone, payView } from "@/lib/data/reportPay";

/**
 * tc-0024 (the owner, 10 Nov 2026: "so better keep one" - QR scan only): GET PAID on a scanned shift report.
 *   GET  ?report=<id>                          -> what the report pays now (his own reports only)
 *   POST { reportId, requestId, expect, destination: bank|card }
 *                                               -> pays every card payment on it not paid before, once ever (368)
 *     Clover terminal: a payout request the office pays, as Withdraw did.
 *     S710: the Stripe payout from his payout account (the free one), then 368 is told made / failed - a failed
 *     payout lets the payments go, so the same report can be paid later.
 *     destination card: the TaxiCharg Driver Card (lib/driverCard.js), only when the office has switched it on.
 * expect = the amount the screen showed: if the figures changed since, nothing is paid and the new figures come back.
 * requestId = one per press: pressing twice, or a lost answer, never pays twice.
 */
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQ = /^[A-Za-z0-9_-]{16,64}$/;
const err = (e) => NextResponse.json({ error: e?.message || "Try again." }, { status: e?.status || 500 });

export async function GET(request) {
  const driver = await driverFromRequest(request);
  if (!driver) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("report") || "";
  if (!ID.test(id)) return NextResponse.json({ error: "Which report?" }, { status: 400 });
  try {
    const share = await reportShare(id);
    if (!share || share.driverId !== driver.id) return NextResponse.json({ error: "No such report." }, { status: 404 });
    const pay = payView(share);
    if (pay && !driverCardOn()) pay.cardOn = false;
    return NextResponse.json({ ok: true, pay });
  } catch (e) { return err(e); }
}

export async function POST(request) {
  const driver = await driverFromRequest(request);
  if (!driver) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (driver.status !== "active") return NextResponse.json({ error: "Your account is not active. Contact TaxiCharg support." }, { status: 403 });
  if (!(await rateHit(`tc-getpaid:${driver.id}`, 20, 3600))) return tooMany("Too many tries in an hour. Try again later.");
  let body = {};
  try { body = await request.json(); } catch {}
  const reportId = String(body.reportId || ""), requestId = String(body.requestId || "");
  if (!ID.test(reportId)) return NextResponse.json({ error: "Scan the report again." }, { status: 400 });
  if (!REQ.test(requestId)) return NextResponse.json({ error: "Press GET PAID again." }, { status: 400 });
  const expect = body.expect == null || body.expect === "" ? null : Number(body.expect);
  if (expect != null && !Number.isFinite(expect)) return NextResponse.json({ error: "Scan the report again." }, { status: 400 });
  const destination = body.destination === "card" ? "card" : "bank";
  if (destination === "card" && !driverCardOn()) return NextResponse.json({ ok: false, reason: "The TaxiCharg Driver Card is not switched on yet. Choose your bank." });

  try {
    const r = await reportPay(reportId, driver.id, driver.name, requestId, expect, destination);
    if (!r?.ok) {
      return NextResponse.json({ ok: false, reason: r?.reason || "This report cannot be paid now.", nothing: Boolean(r?.nothing),
        changed: Boolean(r?.changed), pay: r?.share ? payView(r.share) : null });
    }
    if (r.destination === "card" && r.status === "pending") {
      let out;
      try { out = await sendToCard(driver, { requestId, amountCents: Math.round(Number(r.amount) * 100) }); }
      catch (e) { out = { error: e?.message || "The card transfer could not be made." }; }
      if (out?.error) {
        await reportPayDone(r.payoutId, false, null, out.error);
        return NextResponse.json({ ok: false, reason: out.error });
      }
      await reportPayDone(r.payoutId, true, out?.transferId || null, null);
    } else if (r.provider === "stripe" && r.status === "pending") {
      // the same requestId is Stripe's idempotency key, so a second press or a retry never makes a second payout
      let out;
      try { out = await cashOut(driver, { requestId, amountCents: Math.round(Number(r.amount) * 100), method: "standard" }); }
      catch (e) { out = { error: e?.message || "The payout could not be made." }; }
      if (out?.error) {
        await reportPayDone(r.payoutId, false, null, out.error);
        return NextResponse.json({ ok: false, reason: out.error });
      }
      await reportPayDone(r.payoutId, true, out?.payout?.id || null, null);
    }
    return NextResponse.json({ ok: true, paid: { number: r.number || null, amount: Math.round(Number(r.amount) * 100) / 100, payments: r.payments, at: new Date().toISOString() } });
  } catch (e) { return err(e); }
}

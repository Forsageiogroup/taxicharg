import { NextResponse } from "next/server";
import { driverFromRequest } from "@/lib/driverAuth";
import { rateHit, tooMany } from "@/lib/protect";
import { paymentById } from "@/lib/data/terminalPay";
import { sendShare } from "@/lib/terminal/settle";
import { scanOpen, scanClaim, scanClose, scanFor, claimsForScan } from "@/lib/data/terminalMenu";
import { parseReport, sha256, scanSummary } from "@/lib/terminal/menu";
import { reportShare, payView } from "@/lib/data/reportPay";
import { driverCardOn } from "@/lib/driverCard";

/**
 * tc-0019 (9 Nov 2026): TAKINGS BY QR - the driver scans the QR on his shift report (camera or a photo), or
 * types its number. Every payment on the report is checked against TaxiCharg's own records (never the paper):
 *   already in   - credited by itself, as normal
 *   credited now - it had not come in; it is credited now, once ever
 *   voided       - voided, refunded in full or disputed: never credited
 * S710 (Stripe): a share that was not sent is sent now (the same transfer the daily sweep would send - Stripe
 *   gives back the same one if it was made). Clover: a payment not in yet is read again from Clover by the SYD
 *   CABS server within a minute; the page asks again (GET ?scan=...) until it has been.
 * Only his own reports (362 refuses another driver's and tells Accounts).
 *
 *   POST { text, method: camera|photo|typed }   -> { ok, scanId, report, summary, items, checking }
 *   GET  ?scan=<id>                              -> the same, as it stands now
 */
// tc-0024: once the scan is finished, what the report pays now (GET PAID). Never stops the scan: without 368 it is null.
async function payFor(reportId, driverId) {
  if (!reportId) return null;
  try {
    const share = await reportShare(reportId);
    const pay = share && share.driverId === driverId ? payView(share) : null;
    if (pay && !driverCardOn()) pay.cardOn = false;   // the Driver Card button: only when the site is switched on too
    return pay;
  } catch (e) {
    console.error("[takings scan] get paid", e.message || e);
    return null;
  }
}

const view = (x) => ({ ref: x.ref, state: x.state, amount: x.amount != null ? Math.round(Number(x.amount) * 100) / 100 : null, at: x.at || null });

function merged(items, claims, closed) {
  const by = new Map((claims || []).map((c) => [c.payment_ref, c]));
  return (items || []).map((x) => {
    if (by.has(x.ref)) return { ...x, state: "credited_now", amount: Number(by.get(x.ref).amount) };
    if (closed && (x.state === "not_seen" || x.state === "not_credited")) return { ...x, state: "not_found" };
    return x;
  });
}

export async function POST(request) {
  const driver = await driverFromRequest(request);
  if (!driver) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (driver.status !== "active") return NextResponse.json({ error: "Your account is not active. Contact TaxiCharg support." }, { status: 403 });
  if (!(await rateHit(`tc-scan:${driver.id}`, 30, 3600))) return tooMany("Too many scans in an hour. Try again later.");
  let body = {};
  try { body = await request.json(); } catch {}
  const parsed = parseReport(body.text);
  if (!parsed) return NextResponse.json({ error: "That is not a shift report. Scan the QR at the bottom of the report, or type its number (SR-...)." }, { status: 400 });
  const method = !parsed.code ? "typed" : body.method === "photo" ? "photo" : "camera";
  const device = String(request.headers.get("user-agent") || "").slice(0, 120) || null;

  try {
    const r = await scanOpen({ text: parsed.number, codeHash: parsed.code ? sha256(parsed.code) : null, byKind: "driver", byDriver: driver.id, byName: driver.name, method, device });
    if (!r?.ok) return NextResponse.json({ ok: false, refused: r?.refused || "This shift report cannot be used." });
    const provider = r.report.provider;
    let items = r.items || [];
    if (provider === "stripe") {
      for (const x of items.filter((i) => i.state === "not_credited" && i.paymentId)) {
        try {
          const row = await paymentById(x.paymentId);
          if (row) await sendShare(row);
          const c = await scanClaim(r.scanId, x.ref);
          items = items.map((i) => (i.ref === x.ref ? { ...i, ...c } : i));
        } catch (e) {
          console.error("[takings scan] stripe", x.ref, e.message || e);
        }
      }
    }
    const pendingClover = provider === "clover" ? items.filter((i) => i.state === "not_seen" || i.state === "not_credited").length : 0;
    let closed = false;
    if (!pendingClover) { await scanClose(r.scanId); closed = true; }
    const shown = items.map((x) => (closed && (x.state === "not_seen" || x.state === "not_credited") ? { ...x, state: "not_found" } : x));
    return NextResponse.json({
      ok: true, scanId: r.scanId, closed,
      report: { number: r.report.number, provider, from: r.report.from, to: r.report.to },
      summary: scanSummary(shown, closed), items: shown.map(view), checking: pendingClover,
      pay: closed ? await payFor(r.report.id, driver.id) : null,   // tc-0024
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Try again." }, { status: e.status || 500 });
  }
}

export async function GET(request) {
  const driver = await driverFromRequest(request);
  if (!driver) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("scan") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Which scan?" }, { status: 400 });
  try {
    const s = await scanFor(id, driver.id);
    if (!s) return NextResponse.json({ error: "No such scan." }, { status: 404 });
    const closed = s.outcome !== "open";
    const items = merged(s.items, await claimsForScan(s.id), closed);
    return NextResponse.json({ ok: true, scanId: s.id, closed, summary: scanSummary(items, closed), items: items.map(view),
      checking: closed ? 0 : items.filter((x) => x.state === "not_seen" || x.state === "not_credited").length,
      pay: closed ? await payFor(s.report_id, driver.id) : null });   // tc-0024
  } catch (e) {
    return NextResponse.json({ error: e.message || "Try again." }, { status: e.status || 500 });
  }
}

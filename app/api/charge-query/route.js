import { NextResponse } from "next/server";
import { gateForm } from "@/lib/protect";

/**
 * Query a charge (27 Sept). The passenger fills the three steps on this site;
 * the query itself is a SYD CABS complaint (form type charge_query, SQ-
 * reference), so after our own checks it is handed to the SYD CABS site's
 * form endpoint, server to server, with the shared secret that stands in
 * for the human check already done here. One record, one team, one
 * reference the passenger can track.
 *
 *   PARTNER_SUBMIT_SECRET   the same value as in the SYD CABS project
 *   SYDCABS_ORIGIN          https://www.sydcabs.au (default)
 */
const ORIGIN = (process.env.SYDCABS_ORIGIN || "https://www.sydcabs.au").replace(/\/$/, "");

/** 0400 000 000 -> +61400000000; a number already with a country code is kept. */
function e164(raw) {
  const s = String(raw || "").trim();
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+")) return "+" + digits;
  if (digits.length === 10 && digits.startsWith("0")) return "+61" + digits.slice(1);
  if (digits.length === 9 && digits.startsWith("4")) return "+61" + digits;
  if (digits.startsWith("61") && digits.length >= 11) return "+" + digits;
  return s;
}
const str = (v, n = 200) => String(v ?? "").trim().slice(0, n);

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const blocked = await gateForm(request, body, { form: "charge-query", limit: 5 });
  if (blocked) return blocked;
  if (!process.env.PARTNER_SUBMIT_SECRET) {
    return NextResponse.json({ error: "This form is not switched on yet. Please email support@taxicharg.com.au with the details." }, { status: 503 });
  }

  const name = str(body?.name, 120), email = str(body?.email), phone = e164(body?.phone);
  const d = body?.data || {};
  if (!name || !email || !phone) return NextResponse.json({ error: "Name, phone and email are required." }, { status: 400 });
  if (!(Number(d.amount_charged) > 0)) return NextResponse.json({ error: "Please enter the exact amount charged." }, { status: 400 });
  if (!d.charge_date) return NextResponse.json({ error: "Please give the date of the trip or charge." }, { status: 400 });
  if (d.card_last4 && !/^\d{4}$/.test(String(d.card_last4))) return NextResponse.json({ error: "The last four digits of the card, please - four numbers only." }, { status: 400 });

  const data = {
    query_type: str(d.query_type, 80), charge_date: str(d.charge_date, 10), amount_charged: Number(d.amount_charged).toFixed(2),
    pickup_suburb: str(d.pickup_suburb, 80), dropoff_suburb: str(d.dropoff_suburb, 80), trip_time: str(d.trip_time, 5),
    fare_said: d.fare_said ? Number(d.fare_said).toFixed(2) : "", paid_by: str(d.paid_by, 60), evidence: str(d.evidence, 40),
    terminal_id: str(d.terminal_id, 40), invoice_number: str(d.invoice_number, 40), statement_line: str(d.statement_line, 120),
    card_last4: str(d.card_last4, 4), plate: str(d.plate, 12).toUpperCase(), details: str(d.details, 2000),
    submitted_from: "taxicharg.com.au",
  };
  const documents = (Array.isArray(body?.documents) ? body.documents : []).slice(0, 2)
    .filter((x) => x && typeof x.storagePath === "string" && x.storagePath.startsWith("charge_query/"))
    .map((x) => ({ storagePath: x.storagePath, fileName: str(x.fileName, 120) }));

  try {
    const res = await fetch(`${ORIGIN}/api/submit-application`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Partner-Secret": process.env.PARTNER_SUBMIT_SECRET, Origin: ORIGIN },
      body: JSON.stringify({ formType: "charge_query", applicantName: name, applicantEmail: email, applicantPhone: phone, data, documents }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.error) return NextResponse.json({ error: out.error || "Could not send the query. Please try again." }, { status: res.ok ? 400 : res.status });
    return NextResponse.json({ ok: true, reference: out.reference || null, track: `${ORIGIN}/application-status.html` + (out.reference ? `?ref=${encodeURIComponent(out.reference)}` : "") });
  } catch (err) {
    console.error("[charge-query] forward failed:", err.message || err);
    return NextResponse.json({ error: "Could not reach the complaints system. Please try again in a minute, or email support@taxicharg.com.au." }, { status: 502 });
  }
}

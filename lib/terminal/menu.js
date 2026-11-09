/**
 * tc-0019 (9 Nov 2026): the driver's own menu on his terminal - FareTap on the Clover and the TaxiCharg app
 * on the S710 alike (the owner: "same settings goes to the stripe ... the driver can cash out automatic").
 * Pure helpers (no database, no network) so they can be tested on their own.
 *
 * Sign in: the first time on a terminal, the TaxiCharg code (SMS or email); after that his 4-digit terminal PIN.
 * The session token and the shift report's QR code are random; the database keeps only their sha256 (362).
 */
import { createHash, randomBytes } from "node:crypto";

export const sha256 = (s) => createHash("sha256").update(String(s)).digest("hex");

/** A session token for the terminal: 32 random bytes, base64url (43 characters). */
export const newSessionToken = () => randomBytes(32).toString("base64url");
export const isSessionToken = (s) => typeof s === "string" && /^[A-Za-z0-9_-]{43}$/.test(s);

/** The random part of a shift report's QR: 16 bytes, base64url (22 characters). */
export const newReportCode = () => randomBytes(16).toString("base64url");

export const reportNumber = (n) => "SR-" + String(n).replace(/^SR-?/i, "").padStart(6, "0");

/** What the QR on a printed shift report holds: the number and its code, nothing else. */
export const reportQrText = (number, code) => `${reportNumber(number)}.${code}`;

/**
 * A scanned QR or a typed number -> { number: "SR-000123", code: "..." | null }, or null when it is neither.
 * "SR-000123.<code>" (the QR), "SR-000123", "sr 123", "000123", "123" (typed).
 */
export function parseReport(text) {
  const s = String(text || "").trim().replace(/\s+/g, " ");
  if (s.length > 80) return null;
  const m = /^(?:SR[- ]?)?0*([0-9]{1,12})(?:\.([A-Za-z0-9_-]{22}))?$/i.exec(s);
  if (!m || m[1] === "") return null;
  return { number: reportNumber(m[1]), code: m[2] || null };
}

export const isPin = (p) => typeof p === "string" && /^[0-9]{4}$/.test(p);
export const isCode = (c) => typeof c === "string" && /^[0-9]{6}$/.test(c.replace(/\s/g, ""));

/** Where the code went, without giving the number or address away. */
export function maskPhone(p) {
  const d = String(p || "").replace(/\D/g, "");
  if (d.length < 6) return "your mobile";
  return `${d.slice(0, 2)}•• ••• ${d.slice(-3)}`;
}
export function maskEmail(e) {
  const m = /^([^@\s]+)@([^@\s]+)$/.exec(String(e || "").trim());
  if (!m) return "your email";
  return `${m[1][0]}••@${m[2]}`;
}

/** The terminal's sign-in problems, in the driver's words. */
export function problemText(p, extra = {}) {
  switch (p) {
    case "not_paired": return "This terminal is not set up yet. Ask TaxiCharg to pair it with the code on the screen.";
    case "not_active": return "This terminal is not in use (spare or faulty in the register). Ask the office.";
    case "no_driver": return "This terminal is not given to a driver. Ask the office to allocate it to you.";
    case "driver_not_active": return "Your account is not active. Contact the office.";
    case "no_terminal_access": return "You are not set up to use a payment terminal. Contact the office.";
    case "not_his_terminal": return "This terminal is given to another driver.";
    case "needs_code": return "Enter the TaxiCharg code we send you first.";
    case "no_pin": return "Set your 4-digit terminal PIN first.";
    case "wrong_pin": return extra.triesLeft != null ? `Wrong PIN. ${extra.triesLeft} ${extra.triesLeft === 1 ? "try" : "tries"} left.` : "Wrong PIN.";
    case "locked": return `Too many wrong PINs. The menu is locked until ${sydneyTime(extra.until)} - you will need a new TaxiCharg code.`;
    default: return "The menu cannot be opened right now. Try again.";
  }
}

export function sydneyTime(iso) {
  if (!iso) return "later";
  try { return new Date(iso).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" }); }
  catch { return "later"; }
}

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

/**
 * One card payment as the driver sees it on his terminal: the FARE (never the service fee or the card total -
 * the 31 Oct rule), the card, and where it stands.
 */
export function cloverPaymentView(r) {
  const voided = r.voided || r.status === "reversed";
  const fare = r.fee_included && r.fare_before_fee != null ? Number(r.fare_before_fee) : Number(r.total || 0) - Number(r.surcharge || 0);
  return {
    ref: r.clover_payment_id, at: r.paid_at, fare: round2(fare),
    card: [r.card_type, r.last4 ? `••${r.last4}` : ""].filter(Boolean).join(" "),
    state: voided ? "voided" : Number(r.refunded || 0) > 0 ? "refunded" : r.status === "credited" ? "in" : "waiting",
  };
}
export function stripePaymentView(r) {
  const bad = r.status !== "succeeded" || r.disputed || Number(r.refunded_cents || 0) >= Number(r.amount_cents || 0);
  return {
    ref: r.payment_intent_id, at: r.succeeded_at || r.created_at, fare: round2(Number(r.fare_cents || 0) / 100),
    card: [r.card_brand ? String(r.card_brand).toUpperCase() : "", r.card_last4 ? `••${r.card_last4}` : ""].filter(Boolean).join(" "),
    state: bad ? "voided" : Number(r.refunded_cents || 0) > 0 ? "refunded" : ["sent", "partly_reversed"].includes(r.transfer_status) ? "in" : "waiting",
  };
}

/** The shift report list from the terminal: [{ ref, cents, voided }] - checked, at most 500. */
export function cleanItems(items, provider) {
  if (items == null) return [];
  if (!Array.isArray(items) || items.length > 500) return null;
  const re = provider === "stripe" ? /^pi_[A-Za-z0-9]{8,64}$/ : /^[A-Z0-9]{13}$/;
  const out = [];
  for (const x of items) {
    const ref = String(x?.ref || "").trim();
    if (!re.test(ref)) return null;
    const cents = Number(x.cents);
    out.push({ ref, cents: Number.isInteger(cents) && cents >= 0 && cents <= 10000000 ? cents : 0, voided: x.voided === true });
  }
  return out;
}

/** A scan's result in the driver's words. */
export function scanSummary(items, closed) {
  const n = (s) => (items || []).filter((x) => x.state === s).length;
  const sum = (s) => round2((items || []).filter((x) => x.state === s).reduce((a, x) => a + Number(x.amount || 0), 0));
  return {
    found: (items || []).length,
    creditedNow: n("credited_now"), creditedAmount: sum("credited_now"),
    alreadyIn: n("already_in"), voided: n("voided"),
    checking: closed ? 0 : n("not_seen") + n("not_credited"),
    notFound: n("not_found") + (closed ? n("not_seen") + n("not_credited") : 0),
    otherDriver: n("other_driver"), refused: n("refused"),
  };
}

/** tc-0020: the suburb of an address as the tablet saved it ("12 Smith St, Auburn NSW 2144" -> "Auburn"). */
export function suburbOf(text) {
  const parts = String(text || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!parts.length) return "";
  let s = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  if (/^australia$/i.test(s) && parts.length > 1) s = parts[parts.length - 2];
  s = s.replace(/\b(NSW|VIC|QLD|ACT|SA|WA|TAS|NT)\b/gi, "").replace(/\b\d{4}\b/g, "").trim();
  return s.slice(0, 30);
}

const tripCounts = (r) => !r.voided_at && !r.false_job_at;

/** tc-0020: one meter trip on the terminal - number, time, suburbs, total and how it was paid. */
export function tripView(r) {
  const no = r.job_no ? String(r.job_no) : r.receipt_no ? String(r.receipt_no) : "";
  return {
    id: r.id, at: r.ended_at, no: no ? (r.hail ? `HAIL #${no}` : no) : (r.hail ? "HAIL" : "JOB"),
    from: suburbOf(r.pickup_text), to: suburbOf(r.dropoff_text),
    total: round2(Number(r.total_cents || 0) / 100),
    paid: ["card", "cash", "account", "cabcharge"].includes(r.payment_method) ? r.payment_method : "other",
    voided: !tripCounts(r),
  };
}

/** tc-0020: the meter's side of a shift report (voided and false jobs left out). */
export function meterFigures(rows) {
  const ok = (rows || []).filter(tripCounts);
  const sum = (f) => round2(ok.filter(f).reduce((a, r) => a + Number(r.total_cents || 0), 0) / 100);
  return {
    trips: ok.length,
    meterFares: sum(() => true),
    card: sum((r) => r.payment_method === "card"),
    cash: sum((r) => r.payment_method === "cash"),
    other: sum((r) => !["card", "cash"].includes(r.payment_method)),
    levy: round2(ok.reduce((a, r) => a + Number(r.levy_cents || 0), 0) / 100),
    km: Math.round(ok.reduce((a, r) => a + Number(r.distance_m || 0), 0) / 100) / 10,
  };
}

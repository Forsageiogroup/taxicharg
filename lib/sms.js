/**
 * Text messages, through Twilio's plain REST API (no SDK). Server only.
 *
 *   TC_TWILIO_ACCOUNT_SID   AC...
 *   TC_TWILIO_AUTH_TOKEN    (secret)
 *   TC_TWILIO_FROM          the sender: a +61 number, or a Messaging Service
 *                           SID (MG...) - or an alphanumeric sender such as
 *                           TaxiCharg where the carrier allows it
 *
 * Unconfigured, smsConfigured() is false and the log-in page says text
 * codes are not switched on yet - nothing breaks.
 */
export function smsConfigured() {
  return !!(process.env.TC_TWILIO_ACCOUNT_SID && process.env.TC_TWILIO_AUTH_TOKEN && process.env.TC_TWILIO_FROM);
}

/** 0400 000 000 -> +61400000000. Returns null when it is not a number we can text. */
export function toE164(raw) {
  const s = String(raw || "").trim();
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+") && digits.length >= 10 && digits.length <= 15) return "+" + digits;
  if (digits.length === 10 && digits.startsWith("04")) return "+61" + digits.slice(1);
  if (digits.length === 9 && digits.startsWith("4")) return "+61" + digits;
  if (digits.length === 11 && digits.startsWith("614")) return "+" + digits;
  return null;
}

export async function sendSms(to, body) {
  if (!smsConfigured()) return { sent: false, skipped: "sms not configured" };
  const sid = process.env.TC_TWILIO_ACCOUNT_SID, token = process.env.TC_TWILIO_AUTH_TOKEN, from = process.env.TC_TWILIO_FROM;
  const params = new URLSearchParams({ To: to, Body: body });
  params.set(from.startsWith("MG") ? "MessagingServiceSid" : "From", from);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) { console.error("[sms] twilio", res.status, out.message || out); return { sent: false, error: out.message || `twilio ${res.status}` }; }
    return { sent: true, sid: out.sid };
  } catch (err) {
    console.error("[sms]", err.message || err);
    return { sent: false, error: err.message };
  }
}

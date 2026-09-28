import { NextResponse } from "next/server";
import { findDriverByEmail, findDriverByPhone } from "@/lib/data/drivers";
import { signCodeTicket } from "@/lib/auth";
import { clientIp, honeypotTripped, rateHit, tooMany, verifyTurnstile } from "@/lib/protect";
import { codeStepEnabled, sendLoginCode, sendLoginCodeSms, smsCodesEnabled } from "@/lib/loginCode";

/**
 * The first step of the log in (28 Sept): "What's your phone number or
 * email?" A phone gets a six-digit code by text; an email gets it by email
 * (or, if they prefer, the password). Same code table, same ten minutes and
 * five guesses, same one-device-at-a-time; /api/auth/verify-code finishes.
 *
 * Limits: ten starts per connection and three per account in fifteen
 * minutes - a code is a text message somebody pays for.
 */
const NOT_FOUND = "We can't find a TaxiCharg account for that. Check it, or apply to join.";
const hide = (email) => String(email).replace(/^(.{2}).*(@.*)$/, "$1…$2");
const hidePhone = (p) => { const d = String(p).replace(/\D/g, ""); return d.length >= 4 ? "••• ••• " + d.slice(-3) : "your phone"; };

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (honeypotTripped(body)) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  const id = String(body?.identifier || "").trim();
  if (!id) return NextResponse.json({ error: "Type your phone number or email." }, { status: 400 });

  const ip = clientIp(request);
  if (!(await rateHit(`start:ip:${ip}`, 10, 900))) return tooMany("Too many attempts from this connection. Please wait 15 minutes.");
  const human = await verifyTurnstile(body?.turnstileToken, ip);
  if (!human.ok) return NextResponse.json({ error: human.error }, { status: 400 });

  const isEmail = id.includes("@");
  const driver = isEmail ? await findDriverByEmail(id.toLowerCase()) : await findDriverByPhone(id);
  if (!driver) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  if (driver.status === "suspended") return NextResponse.json({ error: "This account is suspended. Contact support for help." }, { status: 403 });
  if (!(await rateHit(`start:driver:${driver.id}`, 3, 900))) return tooMany("We have just sent you codes. Wait 15 minutes before asking for another.");

  try {
    if (isEmail) {
      // no mail set up (or codes switched off): the password does the whole job
      if (!codeStepEnabled()) return NextResponse.json({ via: "password", canPassword: true, email: driver.email });
      await sendLoginCode(driver);
      return NextResponse.json({ ticket: await signCodeTicket(driver.id), via: "email", hint: hide(driver.email), canPassword: true, email: driver.email });
    }
    if (!smsCodesEnabled()) {
      return NextResponse.json({ error: "Text-message codes are not switched on yet. Log in with your email address instead." }, { status: 503 });
    }
    const to = await sendLoginCodeSms(driver);
    return NextResponse.json({ ticket: await signCodeTicket(driver.id), via: "sms", hint: hidePhone(to), canPassword: false, email: driver.email });
  } catch (err) {
    console.error("[start]", err.message || err);
    return NextResponse.json({ error: isEmail ? "We could not send the code. Try again in a minute, or use your password." : "We could not send the text. Try again in a minute, or log in with your email." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyDriverPassword } from "@/lib/data/drivers";
import { issueDriverSession } from "@/lib/session";
import { TRUSTED_COOKIE, isTrustedDevice, signCodeTicket } from "@/lib/auth";
import { clientIp, honeypotTripped, rateHit, tooMany, verifyTurnstile } from "@/lib/protect";
import { codeStepEnabled, sendLoginCode } from "@/lib/loginCode";

/**
 * Log in (27 Sept, tc-0011):
 *   1. the honeypot, the "I am human" check, and a limit per connection and
 *      per account - five wrong tries in fifteen minutes locks the account
 *      for that long, whoever is typing;
 *   2. the password, checked by Supabase Auth;
 *   3. a six-digit code by email, unless this device passed one in the last
 *      30 days ("remember this device") - the reply is { step: "code",
 *      ticket } and /api/auth/verify-code finishes the job.
 * One device at a time as before (lib/session.js).
 */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (honeypotTripped(body)) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  const email = String(body?.email || "").trim().toLowerCase();
  if (!email || !body?.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const ip = clientIp(request);
  if (!(await rateHit(`login:ip:${ip}`, 20, 900))) {
    return tooMany("Too many log-in attempts from this connection. Please wait 15 minutes and try again.");
  }
  if (!(await rateHit(`login:email:${email}`, 5, 900))) {
    return tooMany("Too many attempts for this account. Wait 15 minutes, or choose a new password from \"Forgot your password?\".");
  }
  const human = await verifyTurnstile(body.turnstileToken, ip);
  if (!human.ok) return NextResponse.json({ error: human.error }, { status: 400 });

  const driver = await verifyDriverPassword(email, body.password);
  if (!driver) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (driver.status === "suspended") {
    return NextResponse.json(
      { error: "This account is suspended. Contact support for help." },
      { status: 403 }
    );
  }

  if (codeStepEnabled()) {
    const cookieStore = await cookies();
    const trusted = await isTrustedDevice(cookieStore.get(TRUSTED_COOKIE)?.value, driver.id);
    if (!trusted) {
      try {
        await sendLoginCode(driver);
        const ticket = await signCodeTicket(driver.id);
        const hint = driver.email.replace(/^(.{2}).*(@.*)$/, "$1…$2");
        return NextResponse.json({ step: "code", ticket, hint });
      } catch (err) {
        // the code could not be sent - let the password stand alone rather
        // than lock every driver out, and say so in the log
        console.error("[login] code step skipped:", err.message || err);
      }
    }
  }

  return NextResponse.json(await issueDriverSession(driver));
}

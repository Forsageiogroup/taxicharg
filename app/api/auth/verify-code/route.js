import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findDriverById } from "@/lib/data/drivers";
import { issueDriverSession } from "@/lib/session";
import { TRUSTED_COOKIE, trustedCookieOptions, signTrustedDevice, verifyCodeTicket } from "@/lib/auth";
import { rateHit, tooMany } from "@/lib/protect";
import { checkLoginCode } from "@/lib/loginCode";

/**
 * The second step of a log in: { ticket, code, remember }. The ticket came
 * from /api/auth/start or /api/auth/login and lives ten minutes; the code is checked against
 * its hash (lib/loginCode.js). "remember" marks this device trusted for 30
 * days so the code is not asked again here.
 */
const AGAIN = "That code has expired. Log in again to get a new one.";
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const ticket = await verifyCodeTicket(body?.ticket);
  if (!ticket) return NextResponse.json({ error: AGAIN }, { status: 400 });
  if (!(await rateHit(`code:${ticket.sub}`, 10, 600))) return tooMany("Too many tries. Log in again to get a new code.");

  const result = await checkLoginCode(ticket.sub, body?.code);
  if (result === "wrong") return NextResponse.json({ error: "That code is not right. Check the message and try again." }, { status: 400 });
  if (result !== "ok") return NextResponse.json({ error: AGAIN }, { status: 400 });

  const driver = await findDriverById(ticket.sub);
  if (!driver || driver.status === "suspended") return NextResponse.json({ error: AGAIN }, { status: 400 });

  const reply = await issueDriverSession(driver);
  if (body?.remember) {
    const cookieStore = await cookies();
    cookieStore.set(TRUSTED_COOKIE, await signTrustedDevice(driver.id), trustedCookieOptions);
  }
  return NextResponse.json(reply);
}

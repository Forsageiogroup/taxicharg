import { NextResponse } from "next/server";

/**
 * Public "contact sales" lead form handler.
 *
 * This currently just validates the payload and logs it. Wire it up to
 * email (Resend, Postmark) or your CRM by replacing the TODO below.
 */
export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body || !body.name || !body.email || !body.phone) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // TODO: send an email / push to CRM / Slack webhook here.
  console.log("[contact] new lead:", {
    name: body.name,
    email: body.email,
    phone: body.phone,
    message: body.message || "",
    at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}

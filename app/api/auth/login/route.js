import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyDriverPassword, setDriverSessionId } from "@/lib/data/drivers";
import { createSessionToken, sessionCookieOptions, DRIVER_COOKIE } from "@/lib/auth";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const driver = await verifyDriverPassword(body.email, body.password);
  if (!driver) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (driver.status === "suspended") {
    return NextResponse.json(
      { error: "This account is suspended. Contact support for help." },
      { status: 403 }
    );
  }

  // One active login at a time: claim a fresh session ID for this
  // sign-in and embed it in the token. Any device already signed in
  // with an older session ID gets signed out next time it loads a page.
  const sessionId = crypto.randomUUID();
  await setDriverSessionId(driver.id, sessionId);

  const token = await createSessionToken({ sub: driver.id, email: driver.email, role: "driver", sid: sessionId });
  const cookieStore = await cookies();
  cookieStore.set(DRIVER_COOKIE, token, sessionCookieOptions);

  return NextResponse.json({ ok: true, driver: { id: driver.id, name: driver.name, email: driver.email } });
}

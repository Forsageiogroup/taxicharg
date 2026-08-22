import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyDriverPassword } from "@/lib/data/drivers";
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

  const token = await createSessionToken({ sub: driver.id, email: driver.email, role: "driver" });
  const cookieStore = await cookies();
  cookieStore.set(DRIVER_COOKIE, token, sessionCookieOptions);

  return NextResponse.json({ ok: true, driver: { id: driver.id, name: driver.name, email: driver.email } });
}

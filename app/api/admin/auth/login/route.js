import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_ADMIN_CREDENTIALS } from "@/lib/data/drivers";
import { createSessionToken, sessionCookieOptions, ADMIN_COOKIE } from "@/lib/auth";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // NOTE: single hardcoded admin for the demo. Replace with a real
  // `findAdminByEmail` lookup once you have an admin table.
  if (
    body.email.toLowerCase() !== DEMO_ADMIN_CREDENTIALS.email.toLowerCase() ||
    body.password !== DEMO_ADMIN_CREDENTIALS.password
  ) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await createSessionToken({ sub: "admin", email: body.email, role: "admin" });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, sessionCookieOptions);

  return NextResponse.json({ ok: true });
}

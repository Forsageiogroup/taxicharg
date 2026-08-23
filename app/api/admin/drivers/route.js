import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE } from "@/lib/auth";
import { createDriver } from "@/lib/data/drivers";

async function requireAdmin() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

export async function POST(request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }

  try {
    const { driver, tempPassword } = await createDriver(body);
    return NextResponse.json({ ok: true, driver, tempPassword });
  } catch (err) {
    if (err?.code === "23505") {
      // Postgres unique_violation — email already in use.
      return NextResponse.json({ error: "A driver with that email already exists." }, { status: 409 });
    }
    console.error("[admin create driver]", err);
    return NextResponse.json({ error: "Could not create driver." }, { status: 500 });
  }
}

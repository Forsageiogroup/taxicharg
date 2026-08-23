import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { updateDriverProfile } from "@/lib/data/drivers";

export async function PATCH(request) {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const driver = await updateDriverProfile(session.sub, body);
  if (!driver) return NextResponse.json({ error: "Driver not found." }, { status: 404 });

  const { password, ...safeDriver } = driver;
  return NextResponse.json({ ok: true, driver: safeDriver });
}

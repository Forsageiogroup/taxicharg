import { NextResponse } from "next/server";
import { requireDriverSession } from "@/lib/driverSession";
import { updateDriverProfile } from "@/lib/data/drivers";

export async function PATCH(request) {
  const auth = await requireDriverSession();
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const driver = await updateDriverProfile(auth.session.sub, body);
  if (!driver) return NextResponse.json({ error: "Driver not found." }, { status: 404 });

  const { password, ...safeDriver } = driver;
  return NextResponse.json({ ok: true, driver: safeDriver });
}

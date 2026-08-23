import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE } from "@/lib/auth";
import { assignVehicleDriver } from "@/lib/data/vehicles";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const vehicle = await assignVehicleDriver(id, body?.driverId || null);
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });

  return NextResponse.json({ ok: true, vehicle });
}

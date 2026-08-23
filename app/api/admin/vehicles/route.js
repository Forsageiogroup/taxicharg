import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE } from "@/lib/auth";
import { createVehicle } from "@/lib/data/vehicles";

export async function POST(request) {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.vehicle || !body?.rego) {
    return NextResponse.json({ error: "Vehicle name and rego are required." }, { status: 400 });
  }

  const vehicle = await createVehicle(body);
  return NextResponse.json({ ok: true, vehicle });
}

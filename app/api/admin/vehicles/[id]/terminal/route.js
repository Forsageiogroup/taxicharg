import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE } from "@/lib/auth";
import { updateVehicleTerminal } from "@/lib/data/vehicles";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.provider) {
    return NextResponse.json({ error: "Provider is required." }, { status: 400 });
  }

  const vehicle = await updateVehicleTerminal(id, {
    provider: body.provider,
    merchantRef: body.merchantRef || "",
  });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });

  return NextResponse.json({ ok: true, vehicle });
}

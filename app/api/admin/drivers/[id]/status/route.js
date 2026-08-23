import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE } from "@/lib/auth";
import { setDriverStatus } from "@/lib/data/drivers";

const ALLOWED = new Set(["active", "suspended"]);

export async function PATCH(request, { params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.status || !ALLOWED.has(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const driver = await setDriverStatus(id, body.status);
  if (!driver) return NextResponse.json({ error: "Driver not found." }, { status: 404 });

  return NextResponse.json({ ok: true, driver });
}

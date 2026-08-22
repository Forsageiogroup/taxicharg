import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DRIVER_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return NextResponse.json({ driver: null });

  const driver = await findDriverById(payload.sub);
  if (!driver) return NextResponse.json({ driver: null });

  const { password, ...safeDriver } = driver;
  return NextResponse.json({ driver: safeDriver });
}

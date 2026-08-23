import { NextResponse } from "next/server";
import { requireDriverSession } from "@/lib/driverSession";

export async function GET() {
  const auth = await requireDriverSession();
  if (!auth) return NextResponse.json({ driver: null });

  const { password, ...safeDriver } = auth.driver;
  return NextResponse.json({ driver: safeDriver });
}

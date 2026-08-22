import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DRIVER_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(DRIVER_COOKIE);
  return NextResponse.json({ ok: true });
}

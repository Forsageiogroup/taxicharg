import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { updateDriverConnection } from "@/lib/data/drivers";

export async function POST() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  await updateDriverConnection(session.sub, "clover", {
    connected: false,
    merchantId: null,
    connectedAt: null,
  });
  return NextResponse.json({ ok: true });
}

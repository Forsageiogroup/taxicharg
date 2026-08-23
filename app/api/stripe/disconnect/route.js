import { NextResponse } from "next/server";
import { requireDriverSession } from "@/lib/driverSession";
import { updateDriverConnection } from "@/lib/data/drivers";

export async function POST() {
  const auth = await requireDriverSession();
  if (!auth) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  await updateDriverConnection(auth.session.sub, "stripe", {
    connected: false,
    accountId: null,
    payoutsEnabled: false,
    connectedAt: null,
  });
  return NextResponse.json({ ok: true });
}

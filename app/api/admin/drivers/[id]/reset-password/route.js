import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, ADMIN_COOKIE } from "@/lib/auth";
import { resetDriverPassword } from "@/lib/data/drivers";

export async function POST(request, { params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const result = await resetDriverPassword(id);
  if (!result) return NextResponse.json({ error: "Driver not found." }, { status: 404 });

  // NOTE: in production, email/SMS this to the driver instead of returning
  // it in the response — it's surfaced here only for the demo admin UI.
  return NextResponse.json({ ok: true, tempPassword: result.tempPassword });
}

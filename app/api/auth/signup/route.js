import { NextResponse } from "next/server";

/**
 * Demo signup endpoint. Because the mock data layer lives in memory, a
 * "new" driver created here wouldn't survive a cold start, so instead of
 * faking persistence we validate the input and log the lead. Once you
 * connect a real database, replace this with an actual `createDriver`
 * call in lib/data/drivers.js and issue a session immediately.
 */
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.phone) {
    return NextResponse.json({ error: "Name, email and phone are required." }, { status: 400 });
  }

  console.log("[signup] new driver application:", { ...body, at: new Date().toISOString() });

  return NextResponse.json({
    ok: true,
    message:
      "Thanks! Your application has been received. Our team will verify your details and set up your account.",
  });
}

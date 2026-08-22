import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { updateDriverConnection } from "@/lib/data/drivers";
import { getAccountStatus } from "@/lib/stripe";

export async function GET(request) {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const redirectUrl = new URL("/dashboard/connect", request.url);

  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account");

  try {
    const status = await getAccountStatus(accountId);
    await updateDriverConnection(session.sub, "stripe", {
      connected: status.detailsSubmitted,
      accountId,
      payoutsEnabled: status.payoutsEnabled,
      connectedAt: new Date().toISOString(),
    });
    redirectUrl.searchParams.set("stripe", status.detailsSubmitted ? "success" : "incomplete");
  } catch (err) {
    console.error("[stripe callback]", err);
    redirectUrl.searchParams.set("stripe", "error");
  }

  return NextResponse.redirect(redirectUrl);
}

import { NextResponse } from "next/server";
import { verifyState } from "@/lib/auth";
import { exchangeCodeForToken } from "@/lib/clover";
import { updateDriverConnection } from "@/lib/data/drivers";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const merchantId = searchParams.get("merchant_id");
  const state = searchParams.get("state");

  const redirectUrl = new URL("/dashboard/connect", request.url);

  const statePayload = await verifyState(state);
  if (!statePayload) {
    redirectUrl.searchParams.set("clover", "invalid_state");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    redirectUrl.searchParams.set("clover", "denied");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const token = await exchangeCodeForToken(code);
    await updateDriverConnection(statePayload.driverId, "clover", {
      connected: true,
      merchantId,
      connectedAt: new Date().toISOString(),
      // NOTE: in the mock data layer this is only kept in memory. Once a
      // real database is connected, store `token.access_token` and
      // `token.refresh_token` encrypted at rest — never in a cookie or
      // client-visible response.
    });
    redirectUrl.searchParams.set("clover", "success");
  } catch (err) {
    console.error("[clover callback]", err);
    redirectUrl.searchParams.set("clover", "error");
  }

  return NextResponse.redirect(redirectUrl);
}

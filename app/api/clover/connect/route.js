import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, signState, DRIVER_COOKIE } from "@/lib/auth";
import { isCloverConfigured, getAuthorizeUrl } from "@/lib/clover";

export async function GET(request) {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  if (!isCloverConfigured()) {
    const url = new URL("/dashboard/connect", request.url);
    url.searchParams.set("clover", "not_configured");
    return NextResponse.redirect(url);
  }

  const state = await signState({ driverId: session.sub });
  return NextResponse.redirect(getAuthorizeUrl(state));
}

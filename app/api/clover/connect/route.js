import { NextResponse } from "next/server";
import { signState } from "@/lib/auth";
import { requireDriverSession } from "@/lib/driverSession";
import { isCloverConfigured, getAuthorizeUrl } from "@/lib/clover";

export async function GET(request) {
  const auth = await requireDriverSession();
  if (!auth) return NextResponse.redirect(new URL("/login", request.url));

  if (!isCloverConfigured()) {
    const url = new URL("/dashboard/connect", request.url);
    url.searchParams.set("clover", "not_configured");
    return NextResponse.redirect(url);
  }

  const state = await signState({ driverId: auth.session.sub });
  return NextResponse.redirect(getAuthorizeUrl(state));
}

import { NextResponse } from "next/server";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get(DRIVER_COOKIE)?.value;
    const session = await verifySessionToken(token);
    if (!session || session.role !== "driver") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // There is no back office here any more: the office runs Taxi Charge
  // from its own panel. Old /admin links go to the driver log in.
  if (pathname.startsWith("/admin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};

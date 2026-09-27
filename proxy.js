import { NextResponse } from "next/server";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Writes to our API come from our own pages. A request that carries an
  // Origin from somewhere else is another site's page posting on a visitor's
  // behalf (CSRF): refused. Server-to-server calls (Stripe's webhook,
  // Clover's callback) carry no Origin and pass.
  if (pathname.startsWith("/api/") && request.method !== "GET" && request.method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (origin) {
      let host = "";
      try { host = new URL(origin).host; } catch {}
      const ours = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
      if (host !== ours) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
    }
  }

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
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/:path*"],
};

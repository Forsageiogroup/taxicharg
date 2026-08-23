import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DRIVER_COOKIE } from "@/lib/auth";

/**
 * Landing point when app/dashboard/layout.js finds this device's session
 * ID no longer matches the driver's current one (a newer login happened
 * elsewhere). Clears the now-invalid cookie — a Server Component render
 * can't do that itself — then sends the driver to the login page with a
 * message explaining why they were signed out.
 */
export async function GET(request) {
  const cookieStore = await cookies();
  cookieStore.delete(DRIVER_COOKIE);
  return NextResponse.redirect(new URL("/login?reason=session-replaced", request.url));
}

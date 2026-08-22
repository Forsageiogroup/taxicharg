import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById, updateDriverConnection } from "@/lib/data/drivers";
import { isStripeConfigured, createOnboardingLink } from "@/lib/stripe";

export async function GET(request) {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  const redirectUrl = new URL("/dashboard/connect", request.url);

  if (!isStripeConfigured()) {
    redirectUrl.searchParams.set("stripe", "not_configured");
    return NextResponse.redirect(redirectUrl);
  }

  const driver = await findDriverById(session.sub);

  try {
    const { accountId, url } = await createOnboardingLink({
      existingAccountId: driver.connections.stripe.accountId,
      driverEmail: driver.email,
    });
    if (accountId !== driver.connections.stripe.accountId) {
      await updateDriverConnection(driver.id, "stripe", { accountId });
    }
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[stripe connect]", err);
    redirectUrl.searchParams.set("stripe", "error");
    return NextResponse.redirect(redirectUrl);
  }
}

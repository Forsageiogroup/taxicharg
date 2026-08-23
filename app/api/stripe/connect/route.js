import { NextResponse } from "next/server";
import { requireDriverSession } from "@/lib/driverSession";
import { updateDriverConnection } from "@/lib/data/drivers";
import { isStripeConfigured, createOnboardingLink } from "@/lib/stripe";

export async function GET(request) {
  const auth = await requireDriverSession();
  if (!auth) return NextResponse.redirect(new URL("/login", request.url));
  const { driver } = auth;

  const redirectUrl = new URL("/dashboard/connect", request.url);

  if (!isStripeConfigured()) {
    redirectUrl.searchParams.set("stripe", "not_configured");
    return NextResponse.redirect(redirectUrl);
  }

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

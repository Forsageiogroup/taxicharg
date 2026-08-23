import { NextResponse } from "next/server";
import { requireDriverSession } from "@/lib/driverSession";
import { updateDriverConnection } from "@/lib/data/drivers";
import { getAccountStatus } from "@/lib/stripe";

export async function GET(request) {
  const auth = await requireDriverSession();
  const redirectUrl = new URL("/dashboard/connect", request.url);

  if (!auth) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account");

  try {
    const status = await getAccountStatus(accountId);
    await updateDriverConnection(auth.session.sub, "stripe", {
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

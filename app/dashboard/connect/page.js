import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";
import { isCloverConfigured } from "@/lib/clover";
import { isStripeConfigured } from "@/lib/stripe";
import PageHeader from "@/components/dashboard/PageHeader";
import ConnectionCard from "@/components/dashboard/ConnectionCard";
import StatusBanner from "@/components/dashboard/StatusBanner";

export default async function ConnectPage({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);

  return (
    <div>
      <PageHeader
        title="Connect your payment providers"
        subtitle="Link Clover for EFTPOS and Stripe for card payments & payouts."
      />

      <StatusBanner provider="Clover" code={params?.clover} />
      <StatusBanner provider="Stripe" code={params?.stripe} />

      <div className="grid md:grid-cols-2 gap-6">
        <ConnectionCard
          name="Clover"
          description="Accept tap, swipe and insert payments through your Clover EFTPOS terminal. Fares settle straight into your TaxiCharg balance."
          connected={driver.connections.clover.connected}
          detail={
            driver.connections.clover.connected
              ? `Merchant ID: ${driver.connections.clover.merchantId}`
              : null
          }
          connectHref="/api/clover/connect"
          disconnectHref="/api/clover/disconnect"
          configured={isCloverConfigured()}
          envVarsNeeded={["CLOVER_APP_ID", "CLOVER_APP_SECRET"]}
        />
        <ConnectionCard
          name="Stripe"
          description="Take card-not-present payments and send your earnings straight to your own bank account with Stripe Connect."
          connected={driver.connections.stripe.connected}
          detail={
            driver.connections.stripe.connected
              ? `Payouts enabled: ${driver.connections.stripe.payoutsEnabled ? "Yes" : "Pending"}`
              : null
          }
          connectHref="/api/stripe/connect"
          disconnectHref="/api/stripe/disconnect"
          configured={isStripeConfigured()}
          envVarsNeeded={["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-navy-900/5 bg-white p-6 card-shadow">
        <h2 className="font-bold text-navy-900">How this plugin works</h2>
        <ol className="mt-3 space-y-2 text-sm text-navy-600 list-decimal list-inside">
          <li>Add your real Clover and Stripe API keys as environment variables in Vercel (see the README).</li>
          <li>A driver clicks "Connect" and is redirected to Clover / Stripe to authorise TaxiCharg.</li>
          <li>
            On success, the OAuth callback (<code className="text-xs bg-navy-950/[0.05] px-1.5 py-0.5 rounded">/api/clover/callback</code>{" "}
            and <code className="text-xs bg-navy-950/[0.05] px-1.5 py-0.5 rounded">/api/stripe/callback</code>) stores the
            connection against the driver&apos;s account.
          </li>
          <li>Withdraw Funds and future fare payments then route through whichever provider is connected.</li>
        </ol>
      </div>
    </div>
  );
}

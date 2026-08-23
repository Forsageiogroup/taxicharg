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
        title="Payment connections"
        subtitle="Link your EFTPOS terminal and set up bank payouts."
      />

      <StatusBanner provider="EFTPOS Terminal" code={params?.clover} />
      <StatusBanner provider="Bank Payouts" code={params?.stripe} />

      <div className="grid md:grid-cols-2 gap-6">
        <ConnectionCard
          name="EFTPOS Terminal"
          description="Accept tap, swipe and insert payments through your terminal. Fares settle straight into your TaxiCharg balance."
          connected={driver.connections.clover.connected}
          detail={
            driver.connections.clover.connected
              ? `Terminal reference: ${driver.connections.clover.merchantId}`
              : null
          }
          connectHref="/api/clover/connect"
          disconnectHref="/api/clover/disconnect"
          configured={isCloverConfigured()}
        />
        <ConnectionCard
          name="Bank Payouts"
          description="Take card-not-present payments and send your earnings straight to your own bank account."
          connected={driver.connections.stripe.connected}
          detail={
            driver.connections.stripe.connected
              ? `Payouts enabled: ${driver.connections.stripe.payoutsEnabled ? "Yes" : "Pending"}`
              : null
          }
          connectHref="/api/stripe/connect"
          disconnectHref="/api/stripe/disconnect"
          configured={isStripeConfigured()}
        />
      </div>
    </div>
  );
}

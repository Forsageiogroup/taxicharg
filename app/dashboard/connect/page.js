import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";
import { isCloverConfigured } from "@/lib/clover";
import Link from "next/link";
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
        {/* tc-0012: bank payouts are the driver's own TaxiCharg payout account now */}
        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 flex flex-col">
          <h3 className="font-bold text-navy-900 text-lg">Payout account</h3>
          <p className="mt-3 text-sm text-navy-500 flex-1">
            Your own TaxiCharg payout account, where your TaxiCharg terminal fares are paid and
            where you withdraw to your bank.
          </p>
          <div className="mt-5">
            <Link
              href="/dashboard/payout-account"
              className="w-full flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold text-white brand-gradient hover:opacity-90"
            >
              Open payout account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

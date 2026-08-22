import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";
import { getDriverSummary } from "@/lib/data/payments";
import PageHeader from "@/components/dashboard/PageHeader";
import WithdrawForm from "@/components/dashboard/WithdrawForm";

export default async function WithdrawPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);
  const summary = await getDriverSummary(driver.id);

  return (
    <div>
      <PageHeader title="Withdraw funds" subtitle="Move your settled earnings out whenever you need to." />
      <WithdrawForm
        availableBalance={summary.availableBalance}
        stripeConnected={driver.connections.stripe.connected}
      />
    </div>
  );
}

import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";
import { getDriverSummary } from "@/lib/data/payments";
import { listWithdrawalsForDriver } from "@/lib/data/withdrawals";
import PageHeader from "@/components/dashboard/PageHeader";
import WithdrawForm from "@/components/dashboard/WithdrawForm";
import WithdrawHistory from "@/components/dashboard/WithdrawHistory";

export default async function WithdrawPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);
  const summary = await getDriverSummary(driver.id);
  const history = await listWithdrawalsForDriver(driver.id);

  return (
    <div>
      <PageHeader title="Withdraw funds" />

      <WithdrawForm
        availableBalance={summary.availableBalance}
        accountBalance={driver.balance}
        stripeConnected={driver.connections.stripe.connected}
      />

      <div className="mt-8">
        <h2 className="font-bold text-navy-900 mb-4">Withdraw history</h2>
        <WithdrawHistory driverName={driver.name} history={history} />
      </div>
    </div>
  );
}

import { cookies } from "next/headers";
import Link from "next/link";
import { DollarSign, Car, Clock, TrendingUp } from "lucide-react";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";
import { getDriverSummary, listPaymentsForDriver } from "@/lib/data/payments";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import StatusPill from "@/components/dashboard/StatusPill";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default async function OverviewPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);
  const summary = await getDriverSummary(driver.id);
  const recent = await listPaymentsForDriver(driver.id, { limit: 6 });

  const cloverConnected = driver.connections.clover.connected;
  const stripeConnected = driver.connections.stripe.connected;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="Here's how your earnings are tracking."
        action={
          <Link
            href="/dashboard/withdraw"
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white brand-gradient hover:opacity-90"
          >
            Withdraw funds
          </Link>
        }
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Today" value={currency(summary.todayTotal)} sub={`${summary.todayTrips} trips`} icon={DollarSign} accent />
        <StatCard label="This week" value={currency(summary.weekTotal)} sub={`${summary.weekTrips} trips`} icon={Car} />
        <StatCard label="This month" value={currency(summary.monthTotal)} sub={`${summary.monthTrips} trips`} icon={TrendingUp} />
        <StatCard label="Pending payout" value={currency(summary.pendingPayout)} sub="Settles within 24h" icon={Clock} />
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-900/5 flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Recent activity</h2>
            <Link href="/dashboard/payments" className="text-sm font-semibold text-orange-500 hover:text-orange-600">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-navy-400 border-b border-navy-900/5">
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Method</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-navy-900/5 last:border-0">
                    <td className="px-6 py-3.5 text-navy-700">
                      {new Date(r.date).toLocaleString("en-AU", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-navy-700">{r.method}</td>
                    <td className="px-6 py-3.5 font-semibold text-navy-900">{currency(r.total)}</td>
                    <td className="px-6 py-3.5">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
          <h2 className="font-bold text-navy-900">Payment connections</h2>
          <p className="text-sm text-navy-500 mt-1">Link your accounts to accept and settle fares.</p>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-navy-900/5 px-4 py-3">
              <div>
                <p className="font-semibold text-navy-900 text-sm">Clover</p>
                <p className="text-xs text-navy-400">EFTPOS terminal</p>
              </div>
              <StatusPill status={cloverConnected ? "connected" : "disconnected"} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-navy-900/5 px-4 py-3">
              <div>
                <p className="font-semibold text-navy-900 text-sm">Stripe</p>
                <p className="text-xs text-navy-400">Card payments &amp; payouts</p>
              </div>
              <StatusPill status={stripeConnected ? "connected" : "disconnected"} />
            </div>
          </div>

          <Link
            href="/dashboard/connect"
            className="mt-5 inline-block w-full text-center px-5 py-2.5 rounded-full text-sm font-semibold border border-navy-900/10 hover:bg-navy-950/[0.03]"
          >
            Manage connections
          </Link>
        </div>
      </div>
    </div>
  );
}

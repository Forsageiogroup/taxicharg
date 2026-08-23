import { cookies } from "next/headers";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";
import { listPaymentsForDriver } from "@/lib/data/payments";
import { getOverviewMetrics } from "@/lib/data/reports";
import PageHeader from "@/components/dashboard/PageHeader";
import MetricCard from "@/components/dashboard/MetricCard";
import StatusPill from "@/components/dashboard/StatusPill";
import PeriodSelect from "@/components/dashboard/PeriodSelect";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default async function OverviewPage({ searchParams }) {
  const params = await searchParams;
  const period = params?.period || "month";

  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);
  const metrics = await getOverviewMetrics(driver.id, period);
  const recent = await listPaymentsForDriver(driver.id, { limit: 6 });

  return (
    <div>
      <PageHeader
        title="Overview"
        action={
          <Link
            href="/dashboard/withdraw"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-navy-900/10 hover:bg-navy-950/[0.03]"
          >
            <Wallet className="w-4 h-4" /> Withdraw funds
          </Link>
        }
      />

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-navy-900">Key metrics</h2>
        <PeriodSelect value={period} />
      </div>

      <div className="grid sm:grid-cols-3 gap-5">
        <MetricCard label="Face value" value={currency(metrics.faceValue)} changePct={metrics.faceValueChangePct} />
        <MetricCard label="Total commission" value={currency(metrics.commission)} changePct={metrics.commissionChangePct} />
        <MetricCard label="Transactions" value={metrics.transactions} changePct={metrics.transactionsChangePct} />
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-900/5 flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Recent activity</h2>
            <Link href="/dashboard/payments/transactions" className="text-sm font-semibold text-orange-500 hover:text-orange-600">
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

        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Your account</h2>
            <Wallet className="w-5 h-5 text-navy-300" />
          </div>
          <span className="text-sm text-navy-500 mt-1">Account balance</span>
          <div className="mt-1 text-3xl font-extrabold text-navy-900">{currency(driver.balance)}</div>
          <p className="text-xs text-navy-400 mt-1">Money in your account pending withdrawal</p>
          <Link
            href="/dashboard/withdraw"
            className="mt-6 inline-block w-full text-center px-5 py-2.5 rounded-full text-sm font-semibold text-white brand-gradient hover:opacity-90"
          >
            Withdraw funds now
          </Link>
        </div>
      </div>
    </div>
  );
}

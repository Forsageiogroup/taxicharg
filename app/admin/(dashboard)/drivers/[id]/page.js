import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { findDriverById } from "@/lib/data/drivers";
import { getDriverSummary, listPaymentsForDriver } from "@/lib/data/payments";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import StatusPill from "@/components/dashboard/StatusPill";
import { DollarSign, Car, Clock, TrendingUp } from "lucide-react";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default async function AdminDriverDetailPage({ params }) {
  const { id } = await params;
  const driver = await findDriverById(id);
  if (!driver) notFound();

  const summary = await getDriverSummary(driver.id);
  const recent = await listPaymentsForDriver(driver.id, { limit: 10 });

  return (
    <div>
      <Link href="/admin/drivers" className="inline-flex items-center gap-2 text-sm text-navy-500 hover:text-orange-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to drivers
      </Link>

      <PageHeader
        title={driver.name}
        subtitle={`${driver.email} · ${driver.plate} · ${driver.fleet}`}
        action={<StatusPill status={driver.status} />}
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Balance" value={currency(driver.balance)} icon={DollarSign} accent />
        <StatCard label="This week" value={currency(summary.weekTotal)} sub={`${summary.weekTrips} trips`} icon={Car} />
        <StatCard label="This month" value={currency(summary.monthTotal)} sub={`${summary.monthTrips} trips`} icon={TrendingUp} />
        <StatCard label="Pending payout" value={currency(summary.pendingPayout)} icon={Clock} />
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-900/5">
            <h2 className="font-bold text-navy-900">Recent transactions</h2>
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
                    <td className="px-6 py-3 text-navy-700 whitespace-nowrap">
                      {new Date(r.date).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-3 text-navy-700">{r.method}</td>
                    <td className="px-6 py-3 font-semibold text-navy-900">{currency(r.total)}</td>
                    <td className="px-6 py-3">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
          <h2 className="font-bold text-navy-900">Connections</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-navy-900/5 px-4 py-3">
              <div>
                <p className="font-semibold text-navy-900 text-sm">Clover</p>
                <p className="text-xs text-navy-400">{driver.connections.clover.merchantId || "Not connected"}</p>
              </div>
              <StatusPill status={driver.connections.clover.connected ? "connected" : "disconnected"} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-navy-900/5 px-4 py-3">
              <div>
                <p className="font-semibold text-navy-900 text-sm">Stripe</p>
                <p className="text-xs text-navy-400">{driver.connections.stripe.accountId || "Not connected"}</p>
              </div>
              <StatusPill status={driver.connections.stripe.connected ? "connected" : "disconnected"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

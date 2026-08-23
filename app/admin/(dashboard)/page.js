import Link from "next/link";
import { getFleetOverview, getFleetRevenueSeries, getLivePayments, getDriversLast7Days } from "@/lib/data/reports";
import { listVehicles } from "@/lib/data/vehicles";
import PageHeader from "@/components/dashboard/PageHeader";
import AdminMetricCard from "@/components/admin/AdminMetricCard";
import RevenueChart from "@/components/admin/RevenueChart";
import LivePaymentsFeed from "@/components/admin/LivePaymentsFeed";
import Sparkline from "@/components/admin/Sparkline";
import StatusPill from "@/components/dashboard/StatusPill";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default async function AdminOverviewPage() {
  const [overview, series, livePayments, driversWeek, vehicles] = await Promise.all([
    getFleetOverview(),
    getFleetRevenueSeries(14),
    getLivePayments(8),
    getDriversLast7Days(),
    listVehicles(),
  ]);

  const vehicleByDriver = Object.fromEntries(
    vehicles.filter((v) => v.driverId).map((v) => [v.driverId, v.vehicle])
  );

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle={new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      />

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
        <AdminMetricCard
          label="Today"
          value={overview.today.gross}
          changePct={overview.today.changePct}
          trips={overview.today.trips}
          driversTotal={overview.today.drivers}
          companyTotal={overview.today.company}
        />
        <AdminMetricCard
          label="Last 7 days"
          value={overview.last7.gross}
          changePct={overview.last7.changePct}
          trips={overview.last7.trips}
          driversTotal={overview.last7.drivers}
          companyTotal={overview.last7.company}
        />
        <AdminMetricCard
          label="Last 30 days"
          value={overview.last30.gross}
          changePct={overview.last30.changePct}
          trips={overview.last30.trips}
          driversTotal={overview.last30.drivers}
          companyTotal={overview.last30.company}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
          <h2 className="font-bold text-navy-900 mb-4">Revenue — last 14 days</h2>
          <RevenueChart data={series} />
        </div>
        <LivePaymentsFeed payments={livePayments} vehicleByDriver={vehicleByDriver} />
      </div>

      <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-900/5 flex items-center justify-between">
          <h2 className="font-bold text-navy-900">Drivers — last 7 days</h2>
          <span className="text-xs text-navy-400">Click a driver for detail</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-400 border-b border-navy-900/5">
                <th className="px-6 py-3 font-medium">Driver</th>
                <th className="px-6 py-3 font-medium">Vehicle</th>
                <th className="px-6 py-3 font-medium">Trend</th>
                <th className="px-6 py-3 font-medium text-right">Trips</th>
                <th className="px-6 py-3 font-medium text-right">Driver earnings</th>
                <th className="px-6 py-3 font-medium text-right">Company</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {driversWeek.map((d) => {
                const initials = d.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <tr key={d.id} className="border-b border-navy-900/5 last:border-0 hover:bg-navy-950/[0.015]">
                    <td className="px-6 py-3.5">
                      <Link href={`/admin/drivers/${d.id}`} className="flex items-center gap-3 group">
                        <span className="w-8 h-8 rounded-full brand-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {initials}
                        </span>
                        <span className="font-semibold text-navy-900 group-hover:text-orange-600">{d.name}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-navy-600">{vehicleByDriver[d.id] || "—"}</td>
                    <td className="px-6 py-3.5">
                      <Sparkline data={d.daily} />
                    </td>
                    <td className="px-6 py-3.5 text-right text-navy-700">{d.trips}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-green-600">{currency(d.driverEarnings)}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-orange-600">{currency(d.company)}</td>
                    <td className="px-6 py-3.5">
                      <StatusPill status={d.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { getWeeklyReport, getMethodBreakdown } from "@/lib/data/reports";
import PageHeader from "@/components/dashboard/PageHeader";
import BarChart from "@/components/dashboard/BarChart";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default async function ReportsPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const weekly = await getWeeklyReport(session.sub);
  const methods = await getMethodBreakdown(session.sub);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Earnings trends over the last 12 weeks." />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
          <h2 className="font-bold text-navy-900 mb-5">Earnings by payment method</h2>
          <BarChart data={methods} labelKey="method" valueKey="total" formatValue={currency} />
        </div>

        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
          <h2 className="font-bold text-navy-900 mb-5">Weekly totals</h2>
          <BarChart
            data={weekly.slice(0, 8).reverse().map((w) => ({ ...w, label: `w/${w.weekStarting.slice(5)}` }))}
            labelKey="label"
            valueKey="total"
            formatValue={currency}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-900/5">
          <h2 className="font-bold text-navy-900">Weekly breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-400 border-b border-navy-900/5">
                <th className="px-6 py-3 font-medium">Week starting</th>
                <th className="px-6 py-3 font-medium">Trips</th>
                <th className="px-6 py-3 font-medium">Fares</th>
                <th className="px-6 py-3 font-medium">Tips</th>
                <th className="px-6 py-3 font-medium">Fees</th>
                <th className="px-6 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((w) => (
                <tr key={w.weekStarting} className="border-b border-navy-900/5 last:border-0">
                  <td className="px-6 py-3 text-navy-700">
                    {new Date(w.weekStarting).toLocaleDateString("en-AU", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-3 text-navy-700">{w.trips}</td>
                  <td className="px-6 py-3 text-navy-700">{currency(w.fares)}</td>
                  <td className="px-6 py-3 text-navy-700">{currency(w.tips)}</td>
                  <td className="px-6 py-3 text-navy-400">-{currency(w.fees)}</td>
                  <td className="px-6 py-3 font-semibold text-navy-900">{currency(w.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

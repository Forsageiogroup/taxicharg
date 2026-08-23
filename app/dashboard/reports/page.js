import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";
import { getPeriodMetrics, getWeeklyReport, getMethodBreakdown } from "@/lib/data/reports";
import PageHeader from "@/components/dashboard/PageHeader";
import MetricCard from "@/components/dashboard/MetricCard";
import BarChart from "@/components/dashboard/BarChart";
import DateRangePicker from "@/components/dashboard/DateRangePicker";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({ searchParams }) {
  const params = await searchParams;
  const from = params?.from || todayISO(-30);
  const to = params?.to || todayISO();

  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);

  const metrics = await getPeriodMetrics(driver.id, { from, to });
  const weekly = await getWeeklyReport(driver.id);
  const methods = await getMethodBreakdown(driver.id);

  return (
    <div>
      <PageHeader
        title="Report"
        action={<DateRangePicker from={from} to={to} />}
      />

      <h2 className="font-bold text-navy-900 mb-4">Key metrics</h2>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard label="Total face value" value={currency(metrics.faceValue)} />
        <MetricCard label="Total commission" value={currency(metrics.commission)} />
        <MetricCard label="Transactions" value={metrics.transactions} />
        <MetricCard label="Total fees paid" value={currency(metrics.feesPaid)} />
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 sm:p-8">
        <dl className="divide-y divide-navy-900/5">
          <div className="flex items-center justify-between py-3">
            <dt className="text-navy-500">Fees</dt>
            <dd className="font-semibold text-navy-900">{currency(metrics.feesPaid)}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-navy-500">Refunds</dt>
            <dd className="font-semibold text-navy-900">{currency(metrics.refunds)}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-navy-500">Total fees &amp; refunds</dt>
            <dd className="font-semibold text-navy-900">{currency(metrics.totalFeesAndRefunds)}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-navy-700 font-semibold">Amount settled</dt>
            <dd className="font-bold text-green-600">{currency(metrics.amountSettled)}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-navy-500">
              Account balance
              <span className="block text-xs text-navy-400 font-normal">Money in your account pending withdrawal</span>
            </dt>
            <dd className="font-bold text-navy-900">{currency(driver.balance)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
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
    </div>
  );
}

import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { driverForRequest as findDriverById, summaryForRequest as getDriverSummary } from "@/lib/data/request";
import { getPeriodMetrics, getWeeklyReport, getMethodBreakdown, getPaidOut } from "@/lib/data/reports";
import { listPaymentsForDriver } from "@/lib/data/payments";
import { sydneyDay, addDays } from "@/lib/time/sydney";
import { inSydneyRange } from "@/lib/money/report";
import ReportDownload from "@/components/dashboard/ReportDownload";
import PageHeader from "@/components/dashboard/PageHeader";
import MetricCard from "@/components/dashboard/MetricCard";
import BarChart from "@/components/dashboard/BarChart";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import CloverOnly from "@/components/dashboard/CloverOnly";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

// tc-0014: Sydney's today (the server's clock is UTC)
function todayISO(offsetDays = 0) {
  return addDays(sydneyDay(), offsetDays);
}
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export default async function ReportsPage({ searchParams }) {
  const params = await searchParams;
  const from = DAY.test(params?.from || "") ? params.from : todayISO(-30);
  const to = DAY.test(params?.to || "") ? params.to : todayISO();

  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);
  if (!driver?.view?.clover) return <CloverOnly title="Reports" />;   // tc-0013
  // tc-0014: read together, not one after the other
  const [summary, metrics, weekly, methods, paidOut, all] = await Promise.all([
    getDriverSummary(driver.id),
    getPeriodMetrics(driver.id, { from, to }),
    getWeeklyReport(driver.id),
    getMethodBreakdown(driver.id),
    getPaidOut(driver.id, { from, to }),
    listPaymentsForDriver(driver.id, { limit: 0 }),
  ]);
  const periodRows = inSydneyRange(all, from, to).map((r) => ({ date: r.date, status: r.status, method: r.method, card: r.card, total: r.total,
    fee: r.fee, commission: r.commission, refundAmount: r.refundAmount, net: r.net ?? null, voidReason: r.voidReason, reason: r.reason, note: r.note || null }));

  return (
    <div>
      <PageHeader
        title="Report"
        action={<div className="flex items-center gap-2">
          <ReportDownload name={driver.name} from={from} to={to} metrics={metrics} paidOut={paidOut} balance={summary.availableBalance} rows={periodRows} />
          <DateRangePicker from={from} to={to} />
        </div>}
      />

      <h2 className="font-bold text-navy-900 mb-4">Key metrics</h2>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard label="Total face value" value={currency(metrics.faceValue)} />
        <MetricCard label="Your commission" value={currency(metrics.commission)} />
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
            <dt className="text-navy-700 font-semibold">
              Net to you after fees
              <span className="block text-xs text-navy-400 font-normal">Your fares, less the service fee, plus your commission, less refunds</span>
            </dt>
            <dd className="font-bold text-green-600">{currency(metrics.netToYou)}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-navy-500">
              Paid out to you
              <span className="block text-xs text-navy-400 font-normal">Withdrawals paid in these dates</span>
            </dt>
            <dd className="font-semibold text-navy-900">{currency(paidOut)}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-navy-500">
              Clover balance
              <span className="block text-xs text-navy-400 font-normal">Clover money you can ask to be paid</span>
            </dt>
            <dd className="font-bold text-navy-900">{currency(summary.availableBalance)}</dd>
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
            data={weekly.slice(0, 8).reverse().map((w) => ({ ...w, label: `Week of ${new Date(w.weekStarting + "T12:00:00Z").toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" })}` }))}
            labelKey="label"
            valueKey="total"
            formatValue={currency}
          />
        </div>
      </div>
    </div>
  );
}

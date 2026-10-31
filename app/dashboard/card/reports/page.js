import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { driverForRequest as findDriverById } from "@/lib/data/request";
import { cardMoney } from "@/lib/terminal/cardMoney";
import { cardTotals, inDays } from "@/lib/money/cardReport";
import { sydneyDay, addDays } from "@/lib/time/sydney";
import PageHeader from "@/components/dashboard/PageHeader";
import MetricCard from "@/components/dashboard/MetricCard";
import DateRangePicker from "@/components/dashboard/DateRangePicker";
import CardReportDownload from "@/components/dashboard/CardReportDownload";
import CardPaymentsTable from "@/components/dashboard/CardPaymentsTable";
import CardOnly from "@/components/dashboard/CardOnly";

const currency = (n) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** tc-0016: his card fares for a period (Sydney days), with a download. */
export default async function CardReportsPage({ searchParams }) {
  const params = await searchParams;
  const from = DAY.test(params?.from || "") ? params.from : addDays(sydneyDay(), -30);
  const to = DAY.test(params?.to || "") ? params.to : sydneyDay();
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);
  const m = await cardMoney(driver, { stripe: false, limit: 2000 });
  if (!m.cardSide) return <CardOnly title="Card report" />;
  const rows = inDays(m.rows, from, to);
  const t = cardTotals(rows);
  return (
    <div>
      <PageHeader title="Card report"
        action={<div className="flex items-center gap-2">
          <CardReportDownload name={driver.name} from={from} to={to} totals={t} rows={rows} />
          <DateRangePicker from={from} to={to} />
        </div>} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Card fares" value={t.transactions} />
        <MetricCard label="Fares" value={currency(t.fares)} />
        <MetricCard label="Your commission" value={currency(t.commission)} />
        <MetricCard label="Yours" value={currency(t.yours)} />
      </div>
      <p className="mt-3 text-xs text-navy-400">Service charges paid by passengers: {currency(t.serviceCharges)}. Taken back for refunds or disputes: {currency(t.takenBack)}.</p>
      <h2 className="mt-8 mb-4 font-bold text-navy-900">Card fares in this period</h2>
      <CardPaymentsTable rows={rows} empty="No card fares in these dates." />
    </div>
  );
}

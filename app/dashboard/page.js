import { cookies } from "next/headers";
import Link from "next/link";
import { Wallet, Landmark } from "lucide-react";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { driverForRequest as findDriverById } from "@/lib/data/request";   // tc-0014: read once per page view
import { listPaymentsForDriver } from "@/lib/data/payments";
import { summaryForRequest as getDriverSummary } from "@/lib/data/request";
import { getPayoutAccount, shape } from "@/lib/data/stripeAccounts";
import { getOverviewMetrics } from "@/lib/data/reports";
import PageHeader from "@/components/dashboard/PageHeader";
import MetricCard from "@/components/dashboard/MetricCard";
import StatusPill from "@/components/dashboard/StatusPill";
import PeriodSelect from "@/components/dashboard/PeriodSelect";
import ReferralCard from "@/components/dashboard/ReferralCard";
import { OFFER, listReferralsForDriver, shareLink } from "@/lib/data/referrals";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default async function OverviewPage({ searchParams }) {
  const params = await searchParams;
  const period = params?.period || "month";

  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);
  const view = driver.view || { clover: false, stripe: false, none: true };
  // tc-0013: the Clover side is read only while a Clover terminal is his
  const metrics = view.clover ? await getOverviewMetrics(driver.id, period) : null;
  const recent = view.clover ? await listPaymentsForDriver(driver.id, { limit: 6 }) : [];
  const summary = view.clover ? await getDriverSummary(driver.id) : null;
  const payout = view.stripe ? shape(await getPayoutAccount(driver.id).catch(() => null)) : null;
  const referrals = await listReferralsForDriver(driver.id);

  return (
    <div>
      <PageHeader
        title="Overview"
        action={view.clover &&
          <Link
            href="/dashboard/withdraw"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-navy-900/10 hover:bg-navy-950/[0.03]"
          >
            <Wallet className="w-4 h-4" /> Withdraw funds
          </Link>
        }
      />

      {view.none && (
        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
          <h2 className="font-bold text-navy-900">No terminal assigned yet</h2>
          <p className="mt-2 text-sm text-navy-500 max-w-prose">
            When TaxiCharg gives you a terminal, your fares and balance show here. You can open your
            payout account now, so it is ready.
          </p>
          <Link href="/dashboard/payout-account" className="mt-4 inline-block text-sm font-semibold text-green-700 underline">Payout account</Link>
        </div>
      )}

      {view.clover && (
        <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-navy-900">Clover terminal</h2>
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
            <Link href="/dashboard/payments/transactions" className="text-sm font-semibold text-green-600 hover:text-green-700">
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
                        // built on the server (UTC on Vercel): show Sydney time
                        timeZone: "Australia/Sydney",
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
          <span className="text-sm text-navy-500 mt-1">Clover balance</span>
          <div className="mt-1 text-3xl font-extrabold text-navy-900">{currency(summary.availableBalance)}</div>
          <p className="text-xs text-navy-400 mt-1">Money in your account pending withdrawal</p>
          <Link
            href="/dashboard/withdraw"
            className="mt-6 inline-block w-full text-center px-5 py-2.5 rounded-full text-sm font-semibold text-white brand-gradient hover:opacity-90"
          >
            Withdraw funds now
          </Link>
        </div>
      </div>

        </>
      )}

      {view.stripe && (
        <div className={`${view.clover ? "mt-8 " : ""}rounded-2xl bg-white border border-navy-900/5 card-shadow p-6`}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-navy-900">TaxiCharg terminal</h2>
            <Landmark className="w-5 h-5 text-navy-300" />
          </div>
          {payout && payout.status === "ready" ? (
            <p className="mt-2 text-sm text-navy-600">Your payout account is ready. Fares you take on your TaxiCharg terminal are paid into your TaxiCharg balance after each trip; you choose when to cash out to your bank.</p>
          ) : (
            <p className="mt-2 text-sm text-amber-800">Open your payout account so fares from your TaxiCharg terminal can be paid to you.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/dashboard/card/transactions" className="text-sm font-semibold text-green-700 underline">Card payments</Link>
            <Link href="/dashboard/card/cashout" className="text-sm font-semibold text-green-700 underline">Cash out</Link>
            <Link href="/dashboard/payout-account" className="text-sm font-semibold text-green-700 underline">Payout account</Link>
          </div>
        </div>
      )}

      <div className="mt-6">
        <ReferralCard code={driver.referralCode} link={driver.referralCode ? shareLink(driver.referralCode) : ""} offer={OFFER} referrals={referrals} />
      </div>
    </div>
  );
}

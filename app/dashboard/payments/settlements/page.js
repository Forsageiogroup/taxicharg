import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { getSettlements } from "@/lib/data/reports";
import PageHeader from "@/components/dashboard/PageHeader";
import StatusPill from "@/components/dashboard/StatusPill";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default async function SettlementsPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const settlements = await getSettlements(session.sub);

  return (
    <div>
      <PageHeader
        title="Settlements"
        subtitle="When your transactions actually land in your account, grouped by day."
      />

      <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-navy-400 border-b border-navy-900/5">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Transactions</th>
                <th className="px-6 py-3 font-medium">Refunds</th>
                <th className="px-6 py-3 font-medium">Amount settled</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((s) => (
                <tr key={s.date} className="border-b border-navy-900/5 last:border-0">
                  <td className="px-6 py-3.5 text-navy-700">
                    {new Date(`${s.date}T00:00:00`).toLocaleDateString("en-AU", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-3.5 text-navy-700">{s.transactions}</td>
                  <td className="px-6 py-3.5 text-navy-400">
                    {s.refunds > 0 ? `-${currency(s.refunds)}` : "—"}
                  </td>
                  <td className="px-6 py-3.5 font-semibold text-navy-900">{currency(s.amount)}</td>
                  <td className="px-6 py-3.5">
                    <StatusPill status={s.status} />
                  </td>
                </tr>
              ))}
              {settlements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-navy-400">
                    No settlements yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

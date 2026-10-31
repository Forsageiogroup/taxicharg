import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { driverForRequest as findDriverById } from "@/lib/data/request";
import { cardMoney } from "@/lib/terminal/cardMoney";
import PageHeader from "@/components/dashboard/PageHeader";
import StatCard from "@/components/dashboard/StatCard";
import StatusPill from "@/components/dashboard/StatusPill";
import CardCashout from "@/components/dashboard/CardCashout";
import CardOnly from "@/components/dashboard/CardOnly";

const currency = (n) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
const day = (d) => (d ? new Date(d).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", day: "2-digit", month: "short", year: "numeric" }) : "-");
const PILL = { paid: "paid", pending: "pending", in_transit: "processing", canceled: "voided", failed: "failed" };

/** tc-0016: his TaxiCharg balance and Cash out (the owner, 31 Oct: he presses Cash out each time). tc-0018: Instant or Free. */
export default async function CardCashoutPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);
  const m = await cardMoney(driver, { limit: 50 });
  if (!m.cardSide) return <CardOnly title="Cash out" />;
  const b = m.balance || { available: 0, onTheWay: 0 };
  return (
    <div>
      <PageHeader title="Cash out" subtitle="Your card fares are paid into your TaxiCharg balance. You choose when to send it to your bank." />
      {m.stripeError && <p className="mb-4 text-sm text-amber-800">{m.stripeError}</p>}
      <div className="grid sm:grid-cols-2 gap-5">
        <StatCard label="Instant cash out" value={m.instant?.on ? currency(m.instant.max) : "-"} accent
          sub={m.instant?.on ? `Now, in about 30 minutes · fee ${m.instant.feePct}%${m.instant.feeMin ? ` (min ${currency(m.instant.feeMin)})` : ""}` : (m.instant?.note || "Not available just now")} />
        <StatCard label="Free cash out" value={currency(b.available)}
          sub={`1-2 business days · no fee${b.onTheWay > 0 ? ` · ${currency(b.onTheWay)} more on the way` : ""}`} />
      </div>
      <div className="mt-6"><CardCashout available={b.available} ready={Boolean(m.account?.ready)} instant={m.instant} /></div>
      <h2 className="mt-8 mb-4 font-bold text-navy-900">Your cash outs</h2>
      {m.payouts.length === 0 ? (
        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 text-sm text-navy-500">No cash outs yet.</div>
      ) : (
        <ul className="rounded-2xl bg-white border border-navy-900/5 card-shadow divide-y divide-navy-900/5">
          {m.payouts.map((p) => (
            <li key={p.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-navy-900">{currency(p.amount)}{p.instant ? <span className="ml-2 text-xs font-semibold text-green-700">Instant · fee {currency(p.fee)}</span> : null}</div>
                <div className="text-xs text-navy-500">Asked {day(p.requestedAt)}{p.arrivesOn && !p.instant ? ` · arrives ${day(p.arrivesOn)}` : ""}{p.failure ? ` · ${p.failure}` : ""}</div>
              </div>
              <StatusPill status={PILL[p.status] || "default"} label={p.label} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

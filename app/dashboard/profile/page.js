import { cookies } from "next/headers";
import Link from "next/link";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";
import PageHeader from "@/components/dashboard/PageHeader";
import StatusPill from "@/components/dashboard/StatusPill";
import EditableField from "@/components/dashboard/EditableField";
import { Wallet, ArrowRight } from "lucide-react";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
const formatDate = (d) => new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);

  const anyConnected = driver.connections.clover.connected || driver.connections.stripe.connected;

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your information" />

      <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 sm:p-8">
        <div>
          <p className="text-xs text-navy-400">Driver name</p>
          <p className="font-semibold text-navy-900 text-lg">{driver.name}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-navy-900/5">
          <div>
            <p className="text-xs text-navy-400">Driver ID</p>
            <p className="font-semibold text-navy-900">{driver.driverId}</p>
          </div>
          <div>
            <p className="text-xs text-navy-400">Terminal number</p>
            <p className="font-semibold text-navy-900">{driver.terminalNumber}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-navy-900/5">
          <div>
            <p className="text-xs text-navy-400">Plate number</p>
            <p className="font-semibold text-navy-900">{driver.plate || "—"}</p>
            <p className="text-xs text-navy-400 mt-1">Set by the office when your terminal is allocated.</p>
          </div>
          <EditableField label="ABN" value={driver.abn} fieldKey="abn" />
        </div>
        <div className="grid sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-navy-900/5">
          <EditableField label="Phone" value={driver.phone} fieldKey="phone" />
          <div>
            <p className="text-xs text-navy-400">Email</p>
            <p className="font-semibold text-navy-900">{driver.email}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 sm:p-8">
        <h2 className="font-bold text-navy-900">Your terminals</h2>
        <p className="mt-1 text-sm text-navy-500">
          The EFTPOS terminals allocated to you by the office. Contact support if one is faulty or needs swapping.
        </p>
        {driver.terminals.length === 0 ? (
          <p className="mt-4 text-sm text-navy-400">No terminal has been allocated to you yet.</p>
        ) : (
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            {driver.terminals.map((t) => (
              <div key={t.id} className="rounded-xl border border-navy-900/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-navy-900">{t.label || `Terminal ${t.serial}`}</p>
                  <StatusPill status={t.status} />
                </div>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-navy-400">Serial</dt><dd className="font-mono text-navy-900">{t.serial}</dd>
                  <dt className="text-navy-400">Terminal ID</dt><dd className="font-mono text-navy-900">{t.tid}</dd>
                  <dt className="text-navy-400">Merchant ID</dt><dd className="font-mono text-navy-900">{t.mid}</dd>
                  <dt className="text-navy-400">Cab</dt><dd className="text-navy-900">{t.plate ? `${t.plate}${t.vehicleClass ? ` · ${t.vehicleClass}` : ""}` : "—"}</dd>
                  <dt className="text-navy-400">Held since</dt><dd className="text-navy-900">{t.since ? formatDate(t.since) : "—"}</dd>
                </dl>
              </div>
            ))}
          </div>
        )}
        {driver.terminalHistory.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold text-navy-700">Terminals you held before</summary>
            <ul className="mt-2 space-y-1 text-navy-600">
              {driver.terminalHistory.map((h) => (
                <li key={h.id}>
                  <span className="font-mono">{h.serial || h.tid}</span>{h.label ? ` (${h.label})` : ""} · {formatDate(h.from)} to {formatDate(h.to)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 sm:p-8">
        <h2 className="font-bold text-navy-900">Withdrawal account</h2>
        <p className="mt-1 text-sm text-navy-500">
          The account your settled fares and payouts are sent to.
        </p>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-navy-900/5 px-4 py-3">
          <div>
            <p className="font-semibold text-navy-900 text-sm">
              {anyConnected ? "Payment account linked" : "No payment account linked"}
            </p>
            <p className="text-xs text-navy-400">
              {anyConnected
                ? "Your EFTPOS terminal and bank payouts are connected."
                : "Connect your terminal and bank payouts to start receiving funds."}
            </p>
          </div>
          <StatusPill status={anyConnected ? "connected" : "disconnected"} />
        </div>

        <Link
          href="/dashboard/connect"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-500 hover:text-green-600"
        >
          Manage payment connections <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="mt-6 rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-navy-900 font-bold">
            <Wallet className="w-4 h-4" /> Your account
          </div>
          <span className="text-sm text-navy-500 mt-2 block">Account balance</span>
          <div className="mt-1 text-2xl font-extrabold text-navy-900">{currency(driver.balance)}</div>
          <p className="text-xs text-navy-400 mt-1">Payment method: {driver.paymentMethod}</p>
        </div>
      </div>
    </div>
  );
}

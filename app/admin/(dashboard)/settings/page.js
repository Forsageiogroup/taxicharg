import { listDrivers } from "@/lib/data/drivers";
import { listVehicles } from "@/lib/data/vehicles";
import { listAllPayments } from "@/lib/data/payments";
import { isCloverConfigured, redirectUri as cloverRedirectUri } from "@/lib/clover";
import { isStripeConfigured } from "@/lib/stripe";
import PageHeader from "@/components/dashboard/PageHeader";

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-navy-900/5 last:border-0">
      <span className="text-sm text-navy-500">{label}</span>
      <span className={`text-sm font-semibold text-navy-900 text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function Pill({ ok, onLabel, offLabel }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
        ok ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      {ok ? onLabel : offLabel}
    </span>
  );
}

export default async function AdminSettingsPage() {
  const [drivers, vehicles, payments] = await Promise.all([
    listDrivers(),
    listVehicles(),
    listAllPayments({ limit: 0 }),
  ]);

  const cloverOn = isCloverConfigured();
  const stripeOn = isStripeConfigured();
  const cloverConnected = drivers.filter((d) => d.connections.clover.connected).length;
  const stripeConnected = drivers.filter((d) => d.connections.stripe.connected).length;

  const CHECKLIST = [
    { done: cloverOn, label: "Clover API keys", detail: "CLOVER_APP_ID / CLOVER_APP_SECRET set in Vercel" },
    { done: stripeOn, label: "Stripe API keys", detail: "STRIPE_SECRET_KEY set in Vercel" },
    { done: true, label: "HTTPS domain", detail: "taxicharg.vercel.app (or your custom domain once connected)" },
    { done: false, label: "Real drivers & terminals", detail: "Replace demo accounts, assign each vehicle's terminal" },
    { done: false, label: "Real database", detail: "Swap the in-memory mock data layer for Postgres/Supabase" },
    { done: false, label: "Parallel run", detail: "Pilot with 2–3 drivers; reconciliation must match your provider to the cent" },
  ];

  return (
    <div>
      <PageHeader title="Settings & status" subtitle="What the system is connected to, and what going live still needs." />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
          <h2 className="font-bold text-navy-900 mb-1">Clover connection</h2>
          <p className="text-xs text-navy-400 mb-3">
            Each driver connects their own Clover merchant account — there's no single shared token.
          </p>
          <Row label="Mode" value={<Pill ok={cloverOn} onLabel="Configured" offLabel="Mock / demo" />} />
          <Row label="Redirect URI" value={cloverRedirectUri()} mono />
          <Row label="Drivers connected" value={`${cloverConnected} / ${drivers.length}`} />
        </div>

        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
          <h2 className="font-bold text-navy-900 mb-1">Bank payouts (Stripe) connection</h2>
          <p className="text-xs text-navy-400 mb-3">
            Same model — each driver's own Stripe Connect account, not a shared one.
          </p>
          <Row label="Mode" value={<Pill ok={stripeOn} onLabel="Configured" offLabel="Mock / demo" />} />
          <Row label="Drivers connected" value={`${stripeConnected} / ${drivers.length}`} />
        </div>

        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
          <h2 className="font-bold text-navy-900 mb-3">Payout policy</h2>
          <Row label="Platform commission" value="8% of every fare" />
          <Row label="Driver share" value="92% of fare + 100% of tips" />
          <Row label="Split rule" value="Fixed at transaction time" />
          <p className="mt-3 text-xs text-navy-400">
            Rates are set in code (<code className="font-mono">lib/data/payments.js</code>) — not editable from the
            browser, so a payout change is always an intentional, reviewed change.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
          <h2 className="font-bold text-navy-900 mb-3">Data</h2>
          <Row label="Drivers" value={drivers.length} />
          <Row label="Vehicles / terminals" value={vehicles.length} />
          <Row label="Payments booked" value={payments.length} />
          <p className="mt-3 text-xs text-navy-400">
            All figures come from the in-memory demo data layer and reset when the app restarts — see the go-live
            checklist below.
          </p>
        </div>

        <div className="lg:col-span-2 rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
          <h2 className="font-bold text-navy-900 mb-4">Go-live checklist</h2>
          <div className="space-y-3">
            {CHECKLIST.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${
                    item.done ? "bg-green-500 border-green-500" : "border-navy-900/20"
                  }`}
                />
                <div>
                  <p className="text-sm font-semibold text-navy-900">{item.label}</p>
                  <p className="text-xs text-navy-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

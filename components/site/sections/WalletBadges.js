import { Smartphone, Wifi } from "lucide-react";

export default function WalletBadges() {
  return (
    <section className="py-16 bg-white border-t border-navy-900/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-center gap-8 text-navy-500">
        <p className="text-sm font-semibold uppercase tracking-wide text-navy-400">
          Works with the wallets you already use
        </p>
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 px-4 py-2 rounded-full border border-navy-900/10 text-sm font-medium">
            <Smartphone className="w-4 h-4" /> Apple Pay
          </span>
          <span className="flex items-center gap-2 px-4 py-2 rounded-full border border-navy-900/10 text-sm font-medium">
            <Smartphone className="w-4 h-4" /> Google Pay
          </span>
          <span className="flex items-center gap-2 px-4 py-2 rounded-full border border-navy-900/10 text-sm font-medium">
            <Wifi className="w-4 h-4 rotate-45" /> Tap &amp; Go
          </span>
        </div>
      </div>
    </section>
  );
}

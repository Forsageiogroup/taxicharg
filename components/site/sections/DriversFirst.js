import Link from "next/link";
import { Check } from "lucide-react";

const points = [
  "Transparent pricing with no surprise deductions",
  "Local support that actually knows the taxi industry",
  "A dashboard that shows exactly where your money is",
];

export default function DriversFirst() {
  return (
    <section className="py-20 bg-navy-950/[0.02]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
        <div className="order-2 lg:order-1">
          <span className="text-sm font-semibold text-orange-500 uppercase tracking-wide">
            Always putting drivers first
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
            Built around the people behind the wheel
          </h2>
          <p className="mt-5 text-navy-600 leading-relaxed">
            We built TaxiCharg with drivers in the room, not as an
            afterthought. That means pricing you can actually understand,
            payouts that land when we say they will, and a support team
            that picks up the phone.
          </p>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-navy-700">
                <span className="mt-0.5 w-5 h-5 rounded-full brand-gradient flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <Link
            href="/about"
            className="inline-block mt-8 font-semibold text-orange-500 hover:text-orange-600"
          >
            Learn more &rarr;
          </Link>
        </div>

        <div className="order-1 lg:order-2">
          <div className="navy-gradient rounded-3xl p-10 sm:p-14 card-shadow">
            <div className="grid grid-cols-2 gap-6">
              {[
                ["24/7", "Driver support"],
                ["<24h", "Typical settlement"],
                ["0", "Lock-in contracts"],
                ["1000+", "NSW drivers"],
              ].map(([stat, label]) => (
                <div key={label}>
                  <div className="text-3xl font-extrabold brand-gradient-text">{stat}</div>
                  <div className="text-sm text-white/60 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

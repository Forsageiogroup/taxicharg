import Link from "next/link";
import { Clock, Percent, Smartphone, RefreshCw, Route } from "lucide-react";
import DashboardMock from "../art/DashboardMock";

const features = [
  {
    icon: Percent,
    title: "Keep more of every fare",
    body: "Low, clearly stated fees and a statement that shows every fare, every fee and every payout. No surprises at the end of the week.",
  },
  {
    icon: Smartphone,
    title: "Easy to use",
    body: "Tap, insert or swipe. Quick to set up, simple for you and your passengers, and a dashboard you can read on your phone between jobs.",
  },
  {
    icon: RefreshCw,
    title: "Swap and go",
    body: "A faulty terminal is a swapped terminal. Bring it to our office and leave with another one — you are back taking fares the same day.",
  },
  {
    icon: Route,
    title: "Operate your way",
    body: "No lock-in contract. Get paid your way — to your Driver Card, by bank transfer, or cash pickup from the office.",
  },
];

export default function Features() {
  return (
    <section className="bg-white py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Instant pay, with the dashboard */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-orange-50 -rotate-2" />
            <DashboardMock className="relative rotate-[-2deg] hover:rotate-0 transition-transform duration-500" />
          </div>
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500 uppercase tracking-wide">
              <Clock className="w-4 h-4" /> Instant pay
            </span>
            <h3 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>
              Money hits different when it&rsquo;s the same day
            </h3>
            <p className="mt-5 text-navy-600 leading-relaxed">
              Every card fare shows on your TaxiCharg dashboard as it settles.
              Withdraw to your Driver Card the moment your shift ends, have it
              sent to your bank, or collect cash from our office &mdash; your
              choice, every time.
            </p>
            <Link href="/driver-card" className="inline-flex items-center gap-1.5 mt-6 font-semibold text-orange-500 hover:text-orange-600">
              About the Driver Card &rarr;
            </Link>
          </div>
        </div>

        {/* the rest, as a list */}
        <div className="mt-20 grid md:grid-cols-2 gap-x-14 gap-y-10">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-5">
              <span className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-white" />
              </span>
              <div>
                <h4 className="text-xl font-extrabold text-navy-900">{title}</h4>
                <p className="mt-2 text-navy-600 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

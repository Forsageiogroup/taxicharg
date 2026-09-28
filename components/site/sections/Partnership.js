import Link from "next/link";
import { Gift } from "lucide-react";
import Reveal from "../motion/Reveal";

export default function Partnership() {
  return (
    <section id="referrals" className="tc-wash py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal className="relative flex justify-center">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full brand-gradient flex items-center justify-center">
            <Gift className="w-28 h-28 text-white" strokeWidth={1.5} />
            {["$", "$", "$", "$", "$"].map((c, i) => (
              <span key={i} className={`tc-coin absolute w-12 h-12 rounded-full bg-white text-green-600 font-extrabold text-xl flex items-center justify-center shadow-lg tc-coin-${i}`}>{c}</span>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>
            Give $50, get $50
          </h3>
          <p className="mt-5 text-navy-600 leading-relaxed">
            Know a driver who would be better off on TaxiCharg? Give them your code. When they take $2,000 in card fares in their first 60 days, you both get $50 in your TaxiCharg balance &mdash; and there is no limit to how many friends you can refer.
          </p>
          <Link href="/support/referral" className="inline-flex items-center gap-1.5 mt-6 font-semibold text-green-600 hover:text-navy-900">
            How referrals work &rarr;
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

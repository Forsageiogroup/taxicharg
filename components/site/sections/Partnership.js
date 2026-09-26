import Link from "next/link";
import { Gift } from "lucide-react";

export default function Partnership() {
  return (
    <section className="bg-[#f6f7f9] py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div className="relative flex justify-center">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full brand-gradient flex items-center justify-center">
            <Gift className="w-28 h-28 text-white" strokeWidth={1.5} />
            {["$", "$", "$", "$", "$"].map((c, i) => (
              <span key={i} className={`tc-coin absolute w-12 h-12 rounded-full bg-white text-green-600 font-extrabold text-xl flex items-center justify-center shadow-lg tc-coin-${i}`}>{c}</span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>
            A partnership that pays
          </h3>
          <p className="mt-5 text-navy-600 leading-relaxed">
            Bring a mate who drives and you both benefit. Referral bonuses are
            paid straight to your TaxiCharg balance once their terminal is
            taking fares. Terms and conditions apply.
          </p>
          <Link href="/support/referral" className="inline-flex items-center gap-1.5 mt-6 font-semibold text-green-500 hover:text-green-600">
            How referrals work &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

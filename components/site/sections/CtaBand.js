import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function CtaBand() {
  return (
    <section className="brand-gradient text-white py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight" style={{ textWrap: "balance" }}>
          Get your EFTPOS terminal and start getting paid today
        </h2>
        <p className="mt-4 text-white/90 max-w-2xl mx-auto">
          Our payment specialists work with drivers every week to set up the right terminal and payout for the way they drive. Let&rsquo;s talk about yours.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/signup" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold btn-glass-dark text-white hover:opacity-95 transition-opacity">
            Apply now <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/support/contact" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold bg-white/15 text-white hover:bg-white/25 transition-colors">
            Talk to us first
          </Link>
        </div>
      </div>
    </section>
  );
}

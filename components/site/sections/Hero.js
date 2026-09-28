import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Banknote } from "lucide-react";
import TerminalArt from "../art/TerminalArt";
import Facets from "../art/Facets";

/**
 * The home hero (27 Sept): green facets edge to edge, navy words, the
 * terminal on the right with the two floating tickets. The Sign up button
 * here is navy - green on green would vanish.
 */
export default function Hero() {
  return (
    <section className="relative overflow-hidden text-white">
      <Facets seed={7} className="absolute inset-0 w-full h-full" />
      <div className="tc-facet-veil absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 items-center">
        <div className="py-16 lg:py-24 pr-0 lg:pr-10">
          <span className="inline-block rounded-full bg-navy-deep/90 text-neon text-xs font-semibold uppercase tracking-wider px-3.5 py-1.5 mb-6">
            The taxi EFTPOS terminal that pays drivers faster
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold leading-[1.08] tracking-tight" style={{ textWrap: "balance" }}>
            Take the fare. Keep more of it. <span className="text-green-300">Get paid today.</span>
          </h1>
          <p className="mt-6 text-lg text-white/85 max-w-xl leading-relaxed">
            TaxiCharg gives Sydney taxi drivers a smart EFTPOS terminal, clear
            statements and fast access to every card fare &mdash; on your card,
            in your bank, or in cash from our office.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold red-gradient transition-opacity">
              Get your EFTPOS terminal <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#how" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-white border-2 border-white/60 hover:bg-white/10 transition-colors">
              See how it works
            </a>
          </div>
          <ul className="mt-9 grid sm:grid-cols-3 gap-4 text-sm font-semibold text-white/90">
            <li className="flex items-center gap-2"><Zap className="w-4 h-4" /> Same-day access to fares</li>
            <li className="flex items-center gap-2"><Banknote className="w-4 h-4" /> No lock-in contract</li>
            <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Secure, PCI-compliant</li>
          </ul>
        </div>

        {/* the picture: the terminal, with the two tickets floating beside it */}
        <div className="relative lg:min-h-[560px] py-10 lg:py-0">
          <div className="relative flex justify-center items-center h-full">
            <TerminalArt size={330} className="w-[260px] sm:w-[330px] h-auto" />
            <div className="tc-float absolute top-8 right-4 sm:right-10 bg-white rounded-xl card-shadow px-4 py-3 text-navy-900">
              <div className="text-[10px] uppercase tracking-wider text-navy-500">Approved</div>
              <div className="text-xl font-extrabold tabular-nums">$56.58</div>
            </div>
            <div className="tc-float-late absolute bottom-4 left-2 sm:left-6 bg-white rounded-xl card-shadow px-4 py-3 text-navy-900 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-navy-deep flex items-center justify-center text-neon text-sm font-bold">$</span>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-navy-500">Paid to you</div>
                <div className="text-sm font-bold">Today, 6:02 pm</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

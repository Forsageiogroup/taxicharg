import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Banknote } from "lucide-react";
import TerminalArt from "../art/TerminalArt";

export default function Hero() {
  return (
    <>
      {/* the ribbon */}
      <div className="tc-streaks text-white">
        <p className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5 text-center text-sm sm:text-base font-semibold tracking-wide">
          The taxi EFTPOS terminal that pays drivers faster
        </p>
      </div>

      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 items-center">
          <div className="py-16 lg:py-24 pr-0 lg:pr-10">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold leading-[1.08] tracking-tight text-navy-900" style={{ textWrap: "balance" }}>
              Take the fare. <span className="text-navy-600 font-bold">Keep more of it.</span>{" "}
              <span className="brand-gradient-text">Get paid today.</span>
            </h1>
            <p className="mt-6 text-lg text-navy-600 max-w-xl leading-relaxed">
              TaxiCharg gives Sydney taxi drivers a smart EFTPOS terminal, clear
              statements and fast access to every card fare &mdash; on your card,
              in your bank, or in cash from our office.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/signup" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-white brand-gradient hover:opacity-90 transition-opacity">
                Get your EFTPOS terminal <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-navy-800 border border-navy-900/15 hover:border-orange-400 hover:text-orange-600 transition-colors">
                See how it works
              </a>
            </div>
            <ul className="mt-9 grid sm:grid-cols-3 gap-4 text-sm text-navy-600">
              <li className="flex items-center gap-2"><Zap className="w-4 h-4 text-orange-500" /> Same-day access to fares</li>
              <li className="flex items-center gap-2"><Banknote className="w-4 h-4 text-orange-500" /> No lock-in contract</li>
              <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-orange-500" /> Secure, PCI-compliant</li>
            </ul>
          </div>

          {/* the picture: a navy panel cut on the diagonal, the terminal in front */}
          <div className="relative lg:min-h-[560px] py-10 lg:py-0">
            <div className="tc-diagonal absolute inset-y-0 right-0 lg:-right-[10vw] left-0 lg:left-8 navy-gradient" />
            <div className="tc-diagonal absolute inset-y-0 right-0 lg:-right-[10vw] left-0 lg:left-8 tc-streaks opacity-40" />
            <div className="relative flex justify-center items-center h-full">
              <TerminalArt size={330} className="w-[260px] sm:w-[330px] h-auto" />
              <div className="tc-float absolute top-8 right-4 sm:right-10 bg-white rounded-xl shadow-xl px-4 py-3 text-navy-900">
                <div className="text-[10px] uppercase tracking-wider text-navy-500">Approved</div>
                <div className="text-xl font-extrabold tabular-nums">$56.58</div>
              </div>
              <div className="tc-float-late absolute bottom-4 left-2 sm:left-6 bg-white rounded-xl shadow-xl px-4 py-3 text-navy-900 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full brand-gradient flex items-center justify-center text-white text-sm font-bold">$</span>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-navy-500">Paid to you</div>
                  <div className="text-sm font-bold">Today, 6:02 pm</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

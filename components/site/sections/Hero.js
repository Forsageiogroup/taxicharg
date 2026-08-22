import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="navy-gradient relative overflow-hidden text-white">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-[32rem] h-[32rem] rounded-full brand-gradient blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-orange-300 text-xs font-semibold tracking-wide uppercase">
            <Zap className="w-3.5 h-3.5" /> Built for NSW taxi drivers
          </span>

          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
            Letting you focus
            <span className="block brand-gradient-text">on the road.</span>
          </h1>

          <p className="mt-6 text-lg text-white/70 max-w-xl">
            TaxiCharg is the driver payment solution that gets fares into
            your pocket faster &mdash; low-fee EFTPOS, instant settlement,
            and a card built for the way you actually drive.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="px-7 py-3.5 rounded-full font-semibold brand-gradient hover:opacity-90 transition-opacity"
            >
              Get Started Now
            </Link>
            <Link
              href="/support/contact"
              className="px-7 py-3.5 rounded-full font-semibold border border-white/20 hover:bg-white/10 transition-colors"
            >
              Talk to sales
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-2 text-sm text-white/50">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            PCI-compliant payments &middot; No lock-in contracts
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <div className="relative w-72 sm:w-96 rotate-3 hover:rotate-0 transition-transform duration-500">
            <Image
              src="/logo.png"
              alt="TaxiCharg driver card"
              width={500}
              height={500}
              priority
              className="w-full h-auto drop-shadow-2xl rounded-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

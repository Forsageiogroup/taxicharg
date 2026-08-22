import Link from "next/link";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SubpageHero from "@/components/site/SubpageHero";
import { CheckCircle2, Wifi, Shield, Zap } from "lucide-react";

const features = [
  { icon: Wifi, title: "Tap, dip or swipe", text: "Accept every major card and mobile wallet, right from the back seat." },
  { icon: Zap, title: "Fast settlement", text: "Fares move into your TaxiCharg balance quickly, not days later." },
  { icon: Shield, title: "Secure by design", text: "PCI-compliant hardware and encrypted transactions on every fare." },
];

export default function EftposPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <SubpageHero
          eyebrow="Taxi EFTPOS machine"
          title="A terminal built for the back seat"
          subtitle="Compact, reliable EFTPOS hardware that pairs with your TaxiCharg account so every fare settles straight to you."
        />

        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-navy-900/5 p-8 card-shadow">
                <div className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-navy-900">{title}</h3>
                <p className="mt-2 text-sm text-navy-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 bg-navy-950/[0.02]">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-extrabold text-navy-900 text-center">What's in the box</h2>
            <ul className="mt-8 grid sm:grid-cols-2 gap-4">
              {[
                "Wireless EFTPOS terminal with all-day battery",
                "In-vehicle mounting kit",
                "Free setup and driver onboarding",
                "24/7 terminal support",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 rounded-xl bg-white border border-navy-900/5 px-5 py-4 text-sm text-navy-700">
                  <CheckCircle2 className="w-5 h-5 text-orange-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="text-center mt-10">
              <Link href="/signup" className="inline-block px-7 py-3.5 rounded-full font-semibold text-white brand-gradient hover:opacity-90">
                Get Started Now
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

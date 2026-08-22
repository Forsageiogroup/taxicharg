import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SubpageHero from "@/components/site/SubpageHero";
import { Clock, Wallet, ShieldCheck, Smartphone } from "lucide-react";

const features = [
  { icon: Clock, title: "Instant settlement", text: "Fares land on your card as they're earned, not on a weekly schedule." },
  { icon: Wallet, title: "Spend anywhere", text: "Use it like any other debit card, online or in person." },
  { icon: Smartphone, title: "Apple Pay & Google Pay", text: "Add it to your phone's wallet for contactless spending." },
  { icon: ShieldCheck, title: "Bank-grade security", text: "Chip, PIN and real-time fraud monitoring on every transaction." },
];

export default function DriverCardPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <SubpageHero
          eyebrow="TaxiCharg Driver Card"
          title="Your earnings, ready the moment you clock off"
          subtitle="The TaxiCharg Driver Card is where your settled fares land automatically — no waiting on a bank transfer."
        />

        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
            <div className="flex justify-center">
              <Image
                src="/logo.png"
                alt="TaxiCharg driver card"
                width={440}
                height={440}
                className="w-72 sm:w-80 h-auto drop-shadow-xl rounded-3xl"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title}>
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-orange-500" />
                  </div>
                  <h3 className="font-bold text-navy-900 text-sm">{title}</h3>
                  <p className="mt-1 text-sm text-navy-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 navy-gradient text-white text-center">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold">Order your card in minutes</h2>
            <p className="mt-3 text-white/70">Sign up as a driver and we'll get your card on its way.</p>
            <Link href="/signup" className="inline-block mt-8 px-7 py-3.5 rounded-full font-semibold brand-gradient hover:opacity-90">
              Get Started Now
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

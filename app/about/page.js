import Link from "next/link";
import { ArrowRight, Banknote, Building2, Handshake, MapPin, ShieldCheck, Users } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import SubNav from "@/components/site/SubNav";
import Footer from "@/components/site/Footer";
import SubpageHero from "@/components/site/SubpageHero";
import Facets from "@/components/site/art/Facets";
import StreetScene from "@/components/site/art/StreetScene";
import TerminalArt from "@/components/site/art/TerminalArt";
import CardArt from "@/components/site/art/CardArt";
import Reveal from "@/components/site/motion/Reveal";

/**
 * About TaxiCharg (28 Sept). Who we are, what we are for, what we stand
 * for, and how to reach us - all of it true, none of it a number we cannot
 * back. The pictures are our own drawings until the owner supplies
 * photographs: drop a file into public/about/ and name it here.
 */
const PHOTOS = {
  street: "",   // e.g. "/about/street.jpg" - a Sydney street at night, a cab in it
  counter: "",  // e.g. "/about/counter.jpg" - the Greenacre counter, a terminal being handed over
};

function Picture({ src, alt, children, className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl card-shadow bg-navy-deep ${className}`}>
      {src ? <img src={src} alt={alt} className="absolute inset-0 w-full h-full object-cover" /> : children}
    </div>
  );
}

export const metadata = {
  title: "About TaxiCharg | The taxi payment company built by cab people",
  description: "TaxiCharg is a Sydney payments company built by people from the taxi trade: fast settlement, clearly stated fees, and an office you can walk into.",
};

export default function AboutPage() {
  const values = [
    [Banknote, "Straight with money", "Every fare, every fee and every payout on one statement, the day it happens. If a driver cannot see where a dollar went, we have failed."],
    [Users, "Built by cab people", "We run taxis in Sydney. The terminal, the paperwork and the support come from people who have sat on a rank at 2 am."],
    [Handshake, "Here, in person", "An office in Greenacre with a counter, not a call centre overseas. Swap a terminal, collect cash, ask a question - face to face."],
  ];
  return (
    <>
      <Navbar />
      <SubNav title="About TaxiCharg" items={[{ href: "#story", label: "Who we are" }, { href: "#mission", label: "Our mission" }, { href: "#values", label: "What we stand for" }, { href: "#work", label: "Work with us" }]} cta={{ href: "/signup", label: "Sign up" }} />
      <main className="flex-1">
        <SubpageHero seed={19} eyebrow="About TaxiCharg" title="Built by people who understand the taxi trade" subtitle="A Sydney payments company that started in a taxi office, for drivers who were tired of slow settlement, unclear fees and support lines that went nowhere." />

        {/* who we are, beside the street */}
        <section id="story" className="tc-grid py-16 sm:py-20 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>The driver&rsquo;s side of the <span className="text-green-600">terminal</span></h2>
              <div className="mt-6 space-y-4 text-navy-700 leading-relaxed">
                <p>Nobody knows the roads better than the person driving them, or knows better how much it matters to have the right support behind you.</p>
                <p>We started TaxiCharg because too many drivers were losing time and money to payment systems that weren&rsquo;t built for them &mdash; fares that took days to settle, fees that only made sense to the company charging them, and a support line that never picked up. We run taxis in Sydney ourselves, so we built the thing we wanted: a terminal that pays out fast, a statement you can read at a glance, and a counter you can walk up to.</p>
                <p>Today TaxiCharg gives NSW taxi drivers a smart EFTPOS terminal, a Driver Card that pays out as fares are earned, and a dashboard that shows exactly where every dollar is &mdash; backed by a team who know the industry because they are in it.</p>
              </div>
              <dl className="mt-8 grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex gap-3"><Building2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /><div><dt className="font-bold text-navy-900">The company</dt><dd className="text-navy-600">NSW Group of Technologies Pty Ltd, trading as TaxiCharg. ABN 37 696 203 059.</dd></div></div>
                <div className="flex gap-3"><MapPin className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /><div><dt className="font-bold text-navy-900">Where</dt><dd className="text-navy-600">Greenacre, Sydney &mdash; the driver service centre where terminals are collected and swapped.</dd></div></div>
              </dl>
            </Reveal>
            <Reveal delay={0.15}>
              <Picture src={PHOTOS.street} alt="A Sydney street at night with a taxi" className="aspect-[16/10] tc-diagonal">
                <StreetScene className="absolute inset-0 w-full h-full" />
              </Picture>
            </Reveal>
          </div>
        </section>

        {/* the mission, in brackets on navy facets */}
        <section id="mission" className="relative overflow-hidden text-white py-16 sm:py-24">
          <Facets tone="deep" seed={83} className="absolute inset-0 w-full h-full" />
          <div className="tc-facet-veil-deep absolute inset-0" />
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Reveal className="relative">
              <div aria-hidden="true" className="hidden sm:block absolute -left-6 -top-6 w-20 h-24 border-l-[14px] border-t-[14px] border-green-500 rounded-tl-sm" />
              <div aria-hidden="true" className="hidden sm:block absolute -right-6 -bottom-6 w-20 h-24 border-r-[14px] border-b-[14px] border-green-500 rounded-br-sm" />
              <div className="relative rounded-2xl bg-navy-deep/70 border border-white/10 px-6 sm:px-12 py-10 sm:py-14 text-center">
                <div className="mx-auto -mt-[4.5rem] mb-5 w-16 h-16 rounded-2xl bg-white card-shadow flex items-center justify-center"><ShieldCheck className="w-8 h-8 text-green-600" /></div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-neon">Our mission</div>
                <h2 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight" style={{ textWrap: "balance" }}>To make sure a Sydney taxi driver keeps more of every fare, and gets it sooner &mdash; with nothing hidden and nobody to chase.</h2>
                <p className="mt-5 text-white/75 max-w-2xl mx-auto">Keeping you moving and being paid for it should not be complicated. Powerful simplicity: a terminal that works, a statement that tells the truth, and money in your hands the same day.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* what we stand for */}
        <section id="values" className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>The three things <span className="text-green-600">behind everything we do</span></h2>
            </Reveal>
            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {values.map(([Icon, t, b], i) => (
                <Reveal key={t} delay={i * 0.1} className="rounded-2xl tc-wash border border-green-600/15 p-8 text-center">
                  <span className="mx-auto w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center"><Icon className="w-7 h-7 text-white" /></span>
                  <h3 className="mt-5 text-xl font-extrabold text-navy-900">{t}</h3>
                  <p className="mt-3 text-navy-600 leading-relaxed">{b}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* work with us, beside the terminal and card */}
        <section id="work" className="tc-wash py-16 sm:py-20 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
            <Reveal className="order-2 lg:order-1">
              <Picture src={PHOTOS.counter} alt="A TaxiCharg terminal and Driver Card" className="aspect-[16/10]">
                <Facets seed={89} className="absolute inset-0 w-full h-full" />
                <div className="tc-facet-veil absolute inset-0" />
                <div className="absolute inset-0 flex items-center justify-center gap-6">
                  <TerminalArt size={220} className="w-[38%] h-auto drop-shadow-2xl" />
                  <CardArt className="w-[44%] h-auto" />
                </div>
              </Picture>
            </Reveal>
            <Reveal delay={0.15} className="order-1 lg:order-2">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>Want to <span className="text-green-600">work with us?</span></h2>
              <div className="mt-6 space-y-4 text-navy-700 leading-relaxed">
                <p>Whether you drive, own a taxi, run a fleet, or build things for the trade, we would like to hear from you. Drivers get a terminal and a Driver Card; operators get one place to see every cab&rsquo;s takings; partners get people who answer the phone.</p>
                <p>If you want to work with a company where being straight with money, knowing the job, and turning up in person are the whole culture &mdash; talk to us.</p>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/signup" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold red-gradient">Sign up as a driver <ArrowRight className="w-4 h-4" /></Link>
                <Link href="/support/contact" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-navy-800 border border-navy-900/15 hover:border-green-500 hover:text-green-600 transition-colors">Talk to us</Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

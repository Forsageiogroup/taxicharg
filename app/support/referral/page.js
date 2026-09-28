import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Check, Gift, Share2, Smartphone, UserPlus } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import SubNav from "@/components/site/SubNav";
import Footer from "@/components/site/Footer";
import SubpageHero from "@/components/site/SubpageHero";
import Facets from "@/components/site/art/Facets";
import Reveal from "@/components/site/motion/Reveal";
import CountUp from "@/components/site/motion/CountUp";
import { OFFER } from "@/lib/data/referrals";

/**
 * Refer a friend (28 Sept). The offer, how it works, what it takes, and the
 * terms in plain words - all from OFFER, so the page and the payout never
 * disagree. Drivers get their code and link on the dashboard Overview and
 * in the app.
 */
const aud = (n) => "$" + Number(n).toLocaleString("en-AU");

export default function ReferralPage() {
  const steps = [
    [Share2, "Share your code", `Your code and share link are on your dashboard. Send it to a driver you know - text, WhatsApp, whatever you use.`],
    [UserPlus, "They join with it", `Your friend enters your code on the Join form. The office sets them up and hands them a terminal.`],
    [Smartphone, `They take ${aud(OFFER.threshold)} in fares`, `Card fares through their TaxiCharg terminal, within ${OFFER.windowDays} days of collecting it. You can watch the count on your dashboard.`],
    [BadgeDollarSign, `You both get ${aud(OFFER.bonus)}`, `The day they reach it, ${aud(OFFER.bonus)} lands in your TaxiCharg balance and ${aud(OFFER.bonus)} in theirs - withdraw it like any other payment.`],
  ];
  const points = [
    "No limit - refer as many drivers as you like, and get the bonus for each one who qualifies.",
    "Nothing asked of you - you only need an active TaxiCharg terminal. A quiet month on your side changes nothing.",
    "Open to every TaxiCharg driver - no invitation, no waiting list.",
    "Paid into your balance, not \"sent\" later - it shows on your dashboard the day your friend qualifies.",
  ];
  const terms = [
    `A referral counts when a new driver joins TaxiCharg using your code (on the Join form or your share link) and takes ${aud(OFFER.threshold)} or more in card fares through their TaxiCharg terminal within ${OFFER.windowDays} days of collecting it. Both of you then receive ${aud(OFFER.bonus)}, credited to your TaxiCharg balances.`,
    "The new driver must not already be, or have previously been, a TaxiCharg driver, and must be set up by the office as a TaxiCharg driver with a terminal allocated to them.",
    "You must hold an active TaxiCharg terminal when the bonus is paid.",
    "Only referrals recorded by our system - the code entered at sign-up - are counted. We cannot credit a referral told to us afterwards.",
    "Referring yourself, or arrangements made to earn the bonus without a real new driver, are not eligible and end your access to the program.",
    "Fares that are reversed or refunded do not count towards the target.",
    "We may change or end the program for future referrals at any time; a referral already made keeps the terms it was made under.",
  ];

  return (
    <>
      <Navbar />
      <SubNav title="Refer a friend" items={[{ href: "#how", label: "How it works" }, { href: "#why", label: "Why ours is better" }, { href: "#terms", label: "Terms" }]} cta={{ href: "/login", label: "Get my code" }} />
      <main className="flex-1">
        <SubpageHero seed={71} eyebrow="Refer a friend" title={`Give ${aud(OFFER.bonus)}, get ${aud(OFFER.bonus)}`} subtitle={`Know a driver who would be better off on TaxiCharg? Give them your code. When they take ${aud(OFFER.threshold)} in card fares in their first ${OFFER.windowDays} days, you both get ${aud(OFFER.bonus)} - and there is no limit to how many friends you can refer.`}>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold red-gradient">Get my code <ArrowRight className="w-4 h-4" /></Link>
            <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full font-semibold text-white border-2 border-white/60 hover:bg-white/10 transition-colors">I have a code &mdash; join</Link>
          </div>
        </SubpageHero>

        {/* the numbers, counting */}
        <section className="tc-wash border-b border-green-600/15">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-3 gap-6">
            {[[OFFER.bonus, "$", " for you"], [OFFER.bonus, "$", " for your friend"], [OFFER.windowDays, "", " days to qualify"]].map(([n, pre, lab], i) => (
              <Reveal key={lab} delay={i * 0.08} className="text-center">
                <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-navy-deep"><CountUp to={n} prefix={pre} /></div>
                <div className="mt-1 text-sm font-medium text-navy-600">{lab}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="tc-grid py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal className="text-center">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>How it works</h2>
              <p className="mt-3 text-navy-500 max-w-2xl mx-auto">Four steps, and you can watch each friend&rsquo;s progress on your dashboard.</p>
            </Reveal>
            <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map(([Icon, t, b], i) => (
                <Reveal key={t} delay={i * 0.1} className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-xl brand-gradient flex items-center justify-center"><Icon className="w-5 h-5 text-white" /></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-green-600">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-extrabold text-navy-900">{t}</h3>
                  <p className="mt-2 text-sm text-navy-600 leading-relaxed">{b}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* why ours is better - on navy facets */}
        <section id="why" className="relative overflow-hidden text-white py-16 sm:py-20">
          <Facets tone="deep" seed={73} className="absolute inset-0 w-full h-full" />
          <div className="tc-facet-veil-deep absolute inset-0" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ textWrap: "balance" }}>A referral program <span className="text-green-300">drivers can actually earn</span></h2>
              <p className="mt-4 text-white/75 leading-relaxed">Plenty of terminal companies offer a referral bonus and then bury it under conditions nobody meets. Ours has one condition, and it is the friend&rsquo;s to meet, not yours.</p>
              <ul className="mt-6 space-y-3">
                {points.map((p) => (
                  <li key={p} className="flex gap-3 text-white/90"><span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-green-500/25 text-green-300 flex items-center justify-center"><Check className="w-3.5 h-3.5" strokeWidth={3} /></span><span>{p}</span></li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.15} className="flex justify-center">
              {/* the code, as it looks on the dashboard */}
              <div className="w-full max-w-sm rounded-2xl bg-white text-navy-900 card-shadow p-6">
                <div className="flex items-center justify-between"><span className="text-[11px] uppercase tracking-wider font-semibold text-green-600">Your code</span><Gift className="w-5 h-5 text-green-600" /></div>
                <div className="mt-3 rounded-lg bg-navy-deep text-white px-4 py-3 font-mono text-xl font-bold tracking-widest text-center">TC-&bull;&bull;&bull;&bull;&bull;&bull;</div>
                <p className="mt-3 text-sm text-navy-600">Every TaxiCharg driver has one. Log in and it is at the bottom of your Overview, with a share link and a copy button.</p>
                <Link href="/login" className="mt-4 inline-flex items-center gap-2 w-full justify-center px-5 py-2.5 rounded-full text-sm font-semibold red-gradient">Log in to get it <ArrowRight className="w-4 h-4" /></Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* terms, in plain words */}
        <section id="terms" className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-900">Referral program terms</h2>
              <p className="mt-2 text-sm text-navy-500">Written to be read. These are the whole terms.</p>
              <ol className="mt-6 space-y-3 text-navy-700 leading-relaxed list-decimal pl-5">
                {terms.map((t) => <li key={t}>{t}</li>)}
              </ol>
              <p className="mt-6 text-sm text-navy-500">Questions? <Link href="/support/contact" className="font-semibold text-green-700">Write to us</Link>.</p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

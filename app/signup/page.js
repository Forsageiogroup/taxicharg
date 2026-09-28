"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, MessageSquareText, PartyPopper, Phone, ShieldCheck } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import SubNav from "@/components/site/SubNav";
import Footer from "@/components/site/Footer";
import Facets from "@/components/site/art/Facets";
import TerminalArt from "@/components/site/art/TerminalArt";
import Reveal from "@/components/site/motion/Reveal";
import Turnstile, { Honeypot } from "@/components/site/Turnstile";

/**
 * Join TaxiCharg (28 Sept): the page behind every Sign up / Apply / Get your
 * terminal button. A banner, what a driver gets beside the terminal, three
 * steps, and the register form on a green block. The form is an application
 * to the office (api/auth/signup), not an account - the office allocates a
 * terminal and sends the login. Everything on the page is true of how
 * TaxiCharg works; there are no invented totals.
 */
const BENEFITS = [
  ["TaxiCharg Driver Card", "Your settled fares land on a card you can spend anywhere."],
  ["Instant pay", "Withdraw the moment your shift ends — card, bank, or cash from our office."],
  ["Low, clearly stated fees", "Every fare, every fee and every payout on one statement. No surprises."],
  ["No lock-in contract", "Stay because it works for you, not because a contract says so."],
  ["Swap and go", "A faulty terminal is a swapped terminal — back on the road the same day."],
  ["A Sydney office that answers", "Real people who know the taxi trade, on the phone and at the counter."],
];
const INTERESTS = [
  ["terminal", "A taxi EFTPOS terminal"],
  ["card", "The TaxiCharg Driver Card"],
  ["both", "Both — terminal and card"],
  ["other", "Something else — call me"],
];

const input = "w-full rounded-lg border border-white/0 bg-white px-4 py-3 text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-deep/60";
const label = "block text-[11px] font-bold uppercase tracking-wider text-white mb-1.5";

export default function SignupPage() {
  const [form, setForm] = useState({ first: "", last: "", phone: "", email: "", interest: "", plate: "", ref: "" });
  // the share link carries the friend's code: /signup?ref=TC-XXXXXX
  useEffect(() => {
    try { const r = new URLSearchParams(window.location.search).get("ref"); if (r) setForm((f) => ({ ...f, ref: r.toUpperCase() })); } catch {}
  }, []);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [token, setToken] = useState("");
  const [company, setCompany] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.first.trim()) return setError("Please tell us your first name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return setError("That email address does not look right.");
    if (form.phone.replace(/\D/g, "").length < 8) return setError("Please give us a mobile number we can call.");
    if (!form.interest) return setError("Tell us what you are interested in.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.first.trim()} ${form.last.trim()}`.trim(),
          email: form.email.trim(), phone: form.phone.trim(), plate: form.plate.trim(),
          interest: (INTERESTS.find((i) => i[0] === form.interest) || [])[1] || "",
          ref: form.ref.trim().toUpperCase(),
          turnstileToken: token, company,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong."); return; }
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <SubNav title="Join TaxiCharg" items={[{ href: "#why", label: "What you get" }, { href: "#how", label: "How it works" }, { href: "#register", label: "Register" }]} cta={{ href: "#register", label: "Register now" }} />
      <main className="flex-1">
        {/* the banner: one line, on the green */}
        <div className="relative overflow-hidden text-white">
          <Facets seed={61} rows={3} className="absolute inset-0 w-full h-full" />
          <div className="tc-facet-veil absolute inset-0" />
          <p className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 text-center text-base sm:text-lg font-bold tracking-wide">
            Get paid instantly &mdash; register now, and we call you back
          </p>
        </div>

        {done ? (
          <section className="tc-grid py-20">
            <Reveal className="mx-auto max-w-xl px-4 rounded-2xl bg-white border border-navy-900/5 card-shadow p-8 sm:p-10 text-center">
              <span className="mx-auto w-14 h-14 rounded-full brand-gradient flex items-center justify-center"><PartyPopper className="w-7 h-7 text-white" /></span>
              <h1 className="mt-5 text-2xl font-extrabold text-navy-900">Thanks, {form.first.trim() || "driver"} &mdash; we have your details</h1>
              <p className="mt-4 text-navy-600 leading-relaxed">One of our team will call you on {form.phone.trim() || "the number you gave"} to talk through the terminal and set up your account. Your login details arrive by email once it is ready.</p>
              <p className="mt-6 text-sm text-navy-500">Already set up? <Link href="/login" className="font-semibold text-green-600">Log in</Link></p>
            </Reveal>
          </section>
        ) : (
          <>
            {/* what you get, beside the terminal */}
            <section id="why" className="tc-grid py-16 sm:py-20">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
                <Reveal className="relative flex justify-center order-2 lg:order-1">
                  <div className="absolute inset-x-8 inset-y-6 rounded-[2rem] bg-green-100 -rotate-2" />
                  <TerminalArt size={360} className="relative w-[260px] sm:w-[360px] h-auto" />
                </Reveal>
                <Reveal delay={0.15} className="order-1 lg:order-2">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>
                    Join <span className="text-green-600">TaxiCharg</span>
                  </h1>
                  <ul className="mt-7 space-y-3.5">
                    {BENEFITS.map(([t, b]) => (
                      <li key={t} className="flex gap-3">
                        <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-green-100 text-green-700 flex items-center justify-center"><Check className="w-3.5 h-3.5" strokeWidth={3} /></span>
                        <div><div className="font-bold text-navy-900">{t}</div><div className="text-sm text-navy-600">{b}</div></div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-7 text-navy-600 leading-relaxed">Leave your details below and one of our team will call you to talk through the terminal, the fees and the way you want to be paid. Nothing is signed online.</p>
                  <a href="#register" className="inline-flex items-center gap-2 mt-6 px-7 py-3.5 rounded-full font-semibold red-gradient">Register now <ArrowRight className="w-4 h-4" /></a>
                </Reveal>
              </div>
            </section>

            {/* three steps */}
            <section id="how" className="tc-wash border-y border-green-600/15 py-14">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
                {[
                  [MessageSquareText, "1. Register", "Two minutes below. Tell us who you are and what you are after."],
                  [Phone, "2. We call you", "A real person talks you through the terminal, the fees and your payout, and books your visit."],
                  [ShieldCheck, "3. Collect and go", "Pick up your terminal from our office, already registered to you, and start taking fares."],
                ].map(([Icon, t, b], i) => (
                  <Reveal key={t} delay={i * 0.1} className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 flex gap-4">
                    <span className="w-11 h-11 shrink-0 rounded-xl brand-gradient flex items-center justify-center"><Icon className="w-5 h-5 text-white" /></span>
                    <div><div className="font-extrabold text-navy-900">{t}</div><p className="mt-1 text-sm text-navy-600 leading-relaxed">{b}</p></div>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* the register form, on the green, in the brackets */}
            <section id="register" className="py-16 sm:py-24 bg-white">
              <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <Reveal className="relative">
                  {/* the brackets */}
                  <div aria-hidden="true" className="hidden sm:block absolute -left-6 -top-6 w-20 h-24 border-l-[14px] border-t-[14px] border-navy-deep rounded-tl-sm" />
                  <div aria-hidden="true" className="hidden sm:block absolute -right-6 -top-6 w-20 h-24 border-r-[14px] border-t-[14px] border-navy-deep rounded-tr-sm" />
                  <div aria-hidden="true" className="hidden sm:block absolute -left-6 -bottom-6 w-20 h-24 border-l-[14px] border-b-[14px] border-navy-deep rounded-bl-sm" />
                  <div aria-hidden="true" className="hidden sm:block absolute -right-6 -bottom-6 w-20 h-24 border-r-[14px] border-b-[14px] border-navy-deep rounded-br-sm" />

                  <form onSubmit={handleSubmit} className="relative overflow-hidden rounded-2xl text-white">
                    <Facets seed={67} className="absolute inset-0 w-full h-full" />
                    <div className="tc-facet-veil absolute inset-0" />
                    <div className="relative p-6 sm:p-10">
                      <div className="mx-auto -mt-2 mb-4 w-16 h-16 rounded-2xl bg-white card-shadow flex items-center justify-center">
                        <MessageSquareText className="w-8 h-8 text-green-600" />
                      </div>
                      <h2 className="text-center text-2xl sm:text-3xl font-extrabold">Register</h2>
                      <p className="mt-2 text-center text-white/80 text-sm max-w-md mx-auto">Fields marked * are needed so we can call you back. Everything else can wait for the call.</p>

                      <div className="mt-8 grid sm:grid-cols-2 gap-5">
                        <div><label className={label}>First name *</label><input required className={input} value={form.first} onChange={set("first")} autoComplete="given-name" /></div>
                        <div><label className={label}>Last name</label><input className={input} value={form.last} onChange={set("last")} autoComplete="family-name" /></div>
                        <div><label className={label}>Mobile phone number *</label><input required type="tel" className={input} value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="04xx xxx xxx" /></div>
                        <div><label className={label}>Email address *</label><input required type="email" className={input} value={form.email} onChange={set("email")} autoComplete="email" /></div>
                        <div><label className={label}>I am interested in *</label>
                          <select required className={input} value={form.interest} onChange={set("interest")}>
                            <option value="">Choose one</option>
                            {INTERESTS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                          </select>
                        </div>
                        <div><label className={label}>Taxi plate <span className="normal-case font-medium text-white/70">(optional)</span></label><input className={`${input} uppercase placeholder:normal-case`} value={form.plate} onChange={set("plate")} placeholder="If you have one already" /></div>
                        <div className="sm:col-span-2"><label className={label}>Referral code <span className="normal-case font-medium text-white/70">(if a driver gave you one)</span></label><input className={`${input} uppercase placeholder:normal-case font-mono tracking-widest`} value={form.ref} onChange={set("ref")} placeholder="TC-XXXXXX" maxLength={9} /><p className="mt-1.5 text-xs text-white/75">With a friend&rsquo;s code you both get $50 once you have taken $2,000 in card fares in your first 60 days. <Link href="/support/referral" className="underline">How it works</Link></p></div>
                      </div>

                      <Honeypot value={company} onChange={setCompany} />
                      <div className="mt-5 flex justify-center"><Turnstile onToken={setToken} /></div>

                      {error && <p className="mt-4 text-center text-sm font-semibold text-white bg-red-700/80 rounded-lg px-4 py-2">{error}</p>}

                      <p className="mt-5 text-center text-sm text-white/85">We handle your details under our <Link href="/legal/privacy" className="underline font-semibold">Privacy Policy</Link> and only use them to set you up.</p>
                      <div className="mt-5 flex justify-center">
                        <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-10 py-3.5 rounded-full font-semibold red-gradient disabled:opacity-60">
                          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Submit
                        </button>
                      </div>
                      <p className="mt-5 text-center text-sm text-white/80">Already have an account? <Link href="/login" className="font-semibold underline">Log in</Link></p>
                    </div>
                  </form>
                </Reveal>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

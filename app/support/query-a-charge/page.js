"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Loader2, Send } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import SubNav from "@/components/site/SubNav";
import Footer from "@/components/site/Footer";
import SubpageHero from "@/components/site/SubpageHero";
import Reveal from "@/components/site/motion/Reveal";
import Turnstile, { Honeypot } from "@/components/site/Turnstile";

/**
 * Query a charge (27 Sept): three steps for a passenger with a taxi charge
 * on their card that is wrong, doubled or not theirs. The same form as
 * sydcabs.au/query-a-charge.html; the query lands with the SYD CABS
 * complaints team as one record with an SQ- reference (api/charge-query).
 */
const TYPES = [
  ["overcharged", "I travelled in a taxi but was charged more than the fare"],
  ["duplicate", "I have been charged twice for one trip"],
  ["not_travelled", "I have a charge but did not travel in a taxi"],
  ["other", "Something else about a card charge"],
];
const TYPE_LABEL = { overcharged: "Charged more than the fare", duplicate: "Charged twice for one trip", not_travelled: "Charged but did not travel", other: "Something else" };
const PAID = [
  ["tap_card", "Tapped or inserted my card"],
  ["phone_wallet", "Phone or watch (Apple Pay, Google Pay)"],
  ["unsure", "I did not pay — I do not recognise this charge"],
  ["other", "Other"],
];
const EVIDENCE = [
  ["receipt", "I have my receipt from SYD CABS", "The printed or emailed receipt from the taxi's terminal."],
  ["statement", "I have the charge on my card statement from SYD CABS", "A line on your bank or card statement."],
  ["taxi", "I have neither, but the taxi was a SYD CABS vehicle and I have the taxi number", "The plate or the number on the roof and doors."],
];
const STEPS = ["Your contact details", "About the charge", "Your evidence"];

const input = "w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-green-400 bg-white";
const label = "block text-sm font-medium text-navy-700 mb-1.5";
const hint = "mt-1 text-xs text-navy-500";
const primary = "inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold red-gradient transition-opacity disabled:opacity-60";
const secondary = "inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-navy-800 border border-navy-900/15 hover:border-green-500 hover:text-green-600 transition-colors";

function Field({ l, children, h }) {
  return (
    <div>
      <label className={label}>{l}</label>
      {children}
      {h && <p className={hint}>{h}</p>}
    </div>
  );
}

async function uploadFile(file) {
  const prep = await fetch("/api/charge-query/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
  });
  const j = await prep.json().catch(() => ({}));
  if (!prep.ok) throw new Error(j.error || "Could not upload the photo.");
  const put = await fetch(j.url, { method: "PUT", headers: { "Content-Type": file.type, "x-upsert": "false" }, body: file });
  if (!put.ok) throw new Error("The photo did not upload. Try a smaller one, or send the query without it.");
  return { storagePath: j.path, fileName: j.fileName };
}

export default function QueryAChargePage() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: "", phone: "", email: "", type: "", date: "", amount: "", pickup: "", dropoff: "", time: "", fareSaid: "", paid: "", evidence: "", terminal: "", invoice: "", descriptor: "", last4: "", plate: "", comments: "", confirm: false });
  const [files, setFiles] = useState([null, null]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [company, setCompany] = useState("");
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const travelled = f.type !== "not_travelled";

  function next() {
    setErr("");
    if (step === 1) {
      if (!f.name.trim()) return setErr("Please tell us your name.");
      if (!f.phone.trim()) return setErr("Please give us a phone number.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return setErr("That email address does not look right.");
    }
    if (step === 2) {
      if (!f.type) return setErr("Please choose what your query is about.");
      if (!f.date) return setErr("Please give the date of the trip or charge.");
      if (new Date(f.date) > new Date()) return setErr("That date is in the future — check it against your statement.");
      if (!(Number(f.amount) > 0)) return setErr("Please enter the exact amount charged, to the cent.");
      if (travelled && (!f.pickup.trim() || !f.dropoff.trim())) return setErr("Where were you picked up and dropped off?");
      if (!f.paid) return setErr("How did you pay?");
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function checkFile(file) {
    if (!file) return null;
    if (file.size > 10 * 1024 * 1024) return "That file is over 10 MB. A photo from your phone is fine — just not the original scan.";
    if (!/^(image\/jpeg|image\/png|application\/pdf)$/.test(file.type)) return "Please attach a JPG, PNG or PDF.";
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!f.evidence) return setErr("Please choose which of the three you have.");
    if (f.evidence === "receipt" && !f.terminal.trim()) return setErr("Please copy the Terminal ID from the receipt.");
    if (f.evidence === "statement" && !f.descriptor.trim()) return setErr("Please copy how the charge appears on your statement.");
    if (f.evidence === "statement" && !/^\d{4}$/.test(f.last4.trim())) return setErr("The last four digits of the card, please — four numbers, nothing more.");
    if (f.evidence === "taxi" && !f.plate.trim()) return setErr("Please give the taxi plate or number.");
    const fe = checkFile(files[0]) || checkFile(files[1]);
    if (fe) return setErr(fe);
    if (!f.confirm) return setErr("Please tick the confirmation.");
    setBusy(true);
    try {
      const documents = [];
      for (const file of files) if (file) documents.push(await uploadFile(file));
      const res = await fetch("/api/charge-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name, phone: f.phone, email: f.email, turnstileToken: token, company, documents,
          data: {
            query_type: TYPE_LABEL[f.type] || f.type, charge_date: f.date, amount_charged: f.amount,
            pickup_suburb: travelled ? f.pickup : "", dropoff_suburb: travelled ? f.dropoff : "", trip_time: travelled ? f.time : "",
            fare_said: travelled ? f.fareSaid : "", paid_by: (PAID.find((p) => p[0] === f.paid) || [])[1] || f.paid,
            evidence: f.evidence === "receipt" ? "Receipt from SYD CABS" : f.evidence === "statement" ? "Card statement line" : "Taxi number",
            terminal_id: f.evidence === "receipt" ? f.terminal : "", invoice_number: f.evidence === "receipt" ? f.invoice : "",
            statement_line: f.evidence === "statement" ? f.descriptor : "", card_last4: f.evidence === "statement" ? f.last4 : "",
            plate: f.evidence === "taxi" ? f.plate : "", details: f.comments,
          },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(j.error || "Something went wrong sending this."); return; }
      setDone(j);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e2) {
      setErr(e2.message || "Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const review = [
    ["Query", TYPE_LABEL[f.type] || f.type], ["Date", f.date.split("-").reverse().join("/")], ["Amount", "$" + Number(f.amount || 0).toFixed(2)],
    ...(travelled ? [["Trip", `${f.pickup} → ${f.dropoff}${f.time ? ", about " + f.time : ""}`]] : []),
    ["Contact", `${f.name} · ${f.email}`],
  ];

  return (
    <>
      <Navbar />
      <SubNav title="Query a card charge" cta={{ href: "/support/contact", label: "Contact us" }} />
      <main className="flex-1">
        <SubpageHero
          seed={53}
          eyebrow="Query a card charge"
          title="A taxi charge that doesn't look right?"
          subtitle="Wrong amount, charged twice, or a trip you didn't take — tell us in three short steps. You get a reference straight away and an answer within five business days."
        />

        <section className="tc-grid py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {done ? (
              <Reveal className="mx-auto max-w-xl rounded-2xl bg-white border border-navy-900/5 card-shadow p-8 sm:p-10 text-center">
                <span className="mx-auto w-14 h-14 rounded-full brand-gradient flex items-center justify-center"><Check className="w-7 h-7 text-white" /></span>
                <h2 className="mt-5 text-2xl font-extrabold text-navy-900">Thanks — we have your query</h2>
                {done.reference && <div className="mt-3 text-4xl font-extrabold tracking-wide text-green-600 tabular-nums">{done.reference}</div>}
                <p className="mt-4 text-navy-600 leading-relaxed">We have emailed you a copy with this reference. Quote it if you contact us. The complaints team will come back to you within five business days.</p>
                {done.track && <a href={done.track} className={`${secondary} mt-6`}>Track this query</a>}
              </Reveal>
            ) : !started ? (
              <div className="grid lg:grid-cols-[1.3fr_.9fr] gap-8 items-start">
                <Reveal className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-8 sm:p-10">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>
                    Need help with a charge? <span className="text-green-600">Let&rsquo;s get started</span>
                  </h2>
                  <p className="mt-3 text-navy-600 leading-relaxed">Three steps, about two minutes. Have your card statement or the taxi receipt to hand &mdash; a photo of either is the fastest way for us to find the trip.</p>
                  <ol className="mt-6 divide-y divide-navy-900/5">
                    {[["Your contact details", "Name, phone and email, so we can reach you with the answer."], ["About the charge", "What is wrong, the date, the exact amount, and where the trip went."], ["Your evidence", "The receipt, the statement line or the taxi number — whichever you have — and a photo if you can."]].map(([t, b], i) => (
                      <li key={t} className="flex gap-4 py-4">
                        <span className="w-10 h-10 shrink-0 rounded-full bg-green-100 text-green-600 font-extrabold flex items-center justify-center">{i + 1}</span>
                        <div><div className="font-bold text-navy-900">{t}</div><p className="text-sm text-navy-600 mt-0.5">{b}</p></div>
                      </li>
                    ))}
                  </ol>
                  <button type="button" onClick={() => setStarted(true)} className={`${primary} mt-4`}>Let&rsquo;s proceed <ArrowRight className="w-4 h-4" /></button>
                  <p className="mt-4 text-sm text-navy-500">Need help along the way? Email <a href="mailto:support@taxicharg.com.au" className="font-semibold text-green-600">support@taxicharg.com.au</a>.</p>
                </Reveal>
                <div className="space-y-5">
                  {[
                    ["What happens next", "You get a reference on screen and by email straight away. The complaints team matches the charge to the trip on the terminal, asks the driver for their version if needed, and comes back to you within five business days. Where a charge is found to be wrong, the refund goes back to the card it came from."],
                    ["Before you dispute it with your bank", "Asking us first is quicker: a bank chargeback takes weeks and freezes the charge while it is looked at. If we cannot resolve it, you keep every right to go to your bank afterwards."],
                    ["Looking for a receipt instead?", "If you only need a copy of a receipt, Receipt search is the quicker route."],
                  ].map(([t, b], i) => (
                    <Reveal key={t} delay={0.1 + i * 0.08} className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
                      <h3 className="font-bold text-navy-900">{t}</h3>
                      <p className="mt-2 text-sm text-navy-600 leading-relaxed">{b}</p>
                      {i === 2 && <Link href="/support/receipt-search" className="inline-block mt-3 text-sm font-semibold text-green-600">Receipt search &rarr;</Link>}
                    </Reveal>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="relative mx-auto max-w-4xl rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
                {/* the three steps */}
                <div className="grid sm:grid-cols-3 border-b border-navy-900/8">
                  {STEPS.map((t, i) => {
                    const n = i + 1, cur = n === step, doneStep = n < step;
                    return (
                      <div key={t} className={`flex items-center gap-3 px-5 py-4 border-b-4 ${cur ? "border-green-500" : "border-transparent"} ${!cur ? "hidden sm:flex" : "flex"}`}>
                        <span className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-extrabold ${cur ? "brand-gradient text-white" : doneStep ? "bg-navy-deep text-green-400" : "border-2 border-navy-900/15 text-navy-500"}`}>{doneStep ? <Check className="w-5 h-5" /> : n}</span>
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-wider font-semibold text-green-600">Step {n} of 3</div>
                          <div className={`text-sm font-semibold ${cur || doneStep ? "text-navy-900" : "text-navy-500"}`}>{t}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-6 sm:p-10 space-y-5">
                  {step === 1 && (
                    <>
                      <div><h2 className="text-xl font-extrabold text-navy-900">So we can contact you about your query</h2><p className="mt-1 text-sm text-navy-500">We only use these to work on this query and tell you the outcome.</p></div>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <Field l="Your name *"><input required className={input} value={f.name} onChange={set("name")} autoComplete="name" /></Field>
                        <Field l="Your phone *"><input required type="tel" className={input} value={f.phone} onChange={set("phone")} autoComplete="tel" placeholder="04xx xxx xxx" /></Field>
                      </div>
                      <Field l="Your email *" h="Your reference and our answer go here. Check it twice."><input required type="email" className={input} value={f.email} onChange={set("email")} autoComplete="email" /></Field>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div><h2 className="text-xl font-extrabold text-navy-900">Tell us about the charge</h2><p className="mt-1 text-sm text-navy-500">The exact amount and the date are how we find the trip on the terminal &mdash; copy them from your statement.</p></div>
                      <Field l="What is your query about? *">
                        <select className={input} value={f.type} onChange={set("type")}><option value="">Select one</option>{TYPES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                      </Field>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <Field l="Date of the trip or charge *" h="If the statement date is a day or two after the trip, use the trip date if you know it."><input type="date" className={input} value={f.date} onChange={set("date")} max={new Date().toISOString().slice(0, 10)} /></Field>
                        <Field l="Exact amount charged *" h="To the cent, as it appears on your statement.">
                          <div className="relative"><span className="absolute left-4 top-2.5 text-sm text-navy-500">$</span><input type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0.00" className={`${input} pl-8`} value={f.amount} onChange={set("amount")} /></div>
                        </Field>
                      </div>
                      {travelled && (
                        <div className="grid sm:grid-cols-2 gap-5">
                          <Field l="Pick-up suburb *"><input className={input} value={f.pickup} onChange={set("pickup")} placeholder="e.g. Lidcombe" /></Field>
                          <Field l="Drop-off suburb *"><input className={input} value={f.dropoff} onChange={set("dropoff")} placeholder="e.g. Sydney Airport" /></Field>
                          <Field l="Time of the trip (roughly)"><input type="time" className={input} value={f.time} onChange={set("time")} /></Field>
                          <Field l="What the meter or driver said the fare was">
                            <div className="relative"><span className="absolute left-4 top-2.5 text-sm text-navy-500">$</span><input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" className={`${input} pl-8`} value={f.fareSaid} onChange={set("fareSaid")} /></div>
                          </Field>
                        </div>
                      )}
                      <Field l="How did you pay? *">
                        <select className={input} value={f.paid} onChange={set("paid")}><option value="">Select one</option>{PAID.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                      </Field>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <div><h2 className="text-xl font-extrabold text-navy-900">Your evidence</h2><p className="mt-1 text-sm text-navy-500">Pick what you have. Any one of these is enough for us to find the trip; a photo makes it quicker.</p></div>
                      <div className="grid gap-3">
                        {EVIDENCE.map(([v, t, b]) => (
                          <label key={v} className={`flex gap-3 items-start rounded-xl border px-4 py-3 cursor-pointer ${f.evidence === v ? "border-green-500 bg-green-50" : "border-navy-900/10"}`}>
                            <input type="radio" name="evidence" value={v} checked={f.evidence === v} onChange={set("evidence")} className="mt-1 accent-[#03c963]" />
                            <span><span className="block font-semibold text-navy-900">{t}</span><span className="block text-sm text-navy-500">{b}</span></span>
                          </label>
                        ))}
                      </div>
                      {f.evidence === "receipt" && (
                        <div className="grid sm:grid-cols-2 gap-5">
                          <Field l="Terminal ID (on the receipt) *"><input className={input} value={f.terminal} onChange={set("terminal")} placeholder="e.g. TID 12345678" /></Field>
                          <Field l="Receipt or invoice number"><input className={input} value={f.invoice} onChange={set("invoice")} placeholder="If shown" /></Field>
                        </div>
                      )}
                      {f.evidence === "statement" && (
                        <div className="grid sm:grid-cols-2 gap-5">
                          <Field l="How the charge appears on the statement *"><input className={input} value={f.descriptor} onChange={set("descriptor")} placeholder="Copy the line, e.g. SYD CABS SYDNEY" /></Field>
                          <Field l="Last 4 digits of the card *" h="Only the last four. Never send us your full card number."><input inputMode="numeric" maxLength={4} className={input} value={f.last4} onChange={(e) => setF({ ...f, last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="1234" /></Field>
                        </div>
                      )}
                      {f.evidence === "taxi" && (
                        <Field l="Taxi plate or number *"><input className={`${input} uppercase`} value={f.plate} onChange={set("plate")} placeholder="e.g. T1234 or ABC12D" /></Field>
                      )}
                      <div className="grid sm:grid-cols-2 gap-5">
                        <Field l="Photo of the receipt or the statement line" h="JPG, PNG or PDF, up to 10 MB. Cover the rest of your statement if you like — we only need the one line."><input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="block w-full text-sm text-navy-700" onChange={(e) => setFiles([e.target.files[0] || null, files[1]])} /></Field>
                        <Field l="A second photo, if you have one"><input type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="block w-full text-sm text-navy-700" onChange={(e) => setFiles([files[0], e.target.files[0] || null])} /></Field>
                      </div>
                      <Field l="Anything else we should know"><textarea rows={3} className={input} value={f.comments} onChange={set("comments")} placeholder="What the driver said, where you were picked up, anything that helps us find the trip." /></Field>

                      <div className="rounded-xl bg-green-50 px-4 py-3 text-sm">
                        <div className="font-bold text-navy-900 mb-1.5">What you have told us</div>
                        <dl className="grid grid-cols-[120px_1fr] gap-y-1 gap-x-3">{review.map(([k, v]) => <div key={k} className="contents"><dt className="text-navy-500">{k}</dt><dd className="text-navy-900">{v}</dd></div>)}</dl>
                      </div>
                      <label className="flex gap-3 items-start text-sm text-navy-700">
                        <input type="checkbox" checked={f.confirm} onChange={set("confirm")} className="mt-0.5 w-4 h-4 accent-[#03c963]" />
                        <span>I confirm this is my card or a card I am authorised to use, and the information is accurate to the best of my knowledge. SYD CABS may share the details of this query with the driver and operator concerned to investigate it.</span>
                      </label>
                      <Honeypot value={company} onChange={setCompany} />
                      <Turnstile onToken={setToken} />
                    </>
                  )}

                  {err && <p className="text-sm text-red-600">{err}</p>}

                  <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                    {step > 1 ? <button type="button" onClick={() => { setErr(""); setStep(step - 1); }} className={secondary}><ArrowLeft className="w-4 h-4" /> Back</button> : <span />}
                    {/* different keys, so React makes a NEW element for the submit button: reusing the
                        Next button's node would let the same click's default action submit the form */}
                    {step < 3 ? (
                      <button key="next" type="button" onClick={next} className={primary}>Next <ArrowRight className="w-4 h-4" /></button>
                    ) : (
                      <button key="send" type="submit" disabled={busy} className={primary}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{busy ? "Sending…" : "Submit my query"}</button>
                    )}
                  </div>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

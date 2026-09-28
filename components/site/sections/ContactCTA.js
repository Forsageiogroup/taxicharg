"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock, Loader2, Mail, MapPin, Paperclip, Phone, Send } from "lucide-react";
import Reveal from "../motion/Reveal";
import Turnstile, { Honeypot } from "../Turnstile";

/**
 * Contact (28 Sept): where to find us on the left, the form on the right.
 * The form asks what it is about, so the right person picks it up, and
 * takes a photo or PDF (a receipt, a statement line, a screen) through a
 * signed upload - the file never passes through a function. A passenger
 * querying a charge is pointed at the three-step form instead, where it
 * gets a reference.
 */
const OFFICE = {
  email: "support@taxicharg.com.au",
  phone: "", // TaxiCharg's own number, when the owner gives it - the row shows once set
  address: ["43-45 Claremont Ave", "Greenacre NSW 2190"],
  maps: "https://www.google.com/maps/search/?api=1&query=43-45+Claremont+Ave+Greenacre+NSW+2190",
  hours: "", // e.g. "Monday - Friday, 9:00am - 5:00pm" - shown only when set
};
const TOPICS = [
  "Signing up for a terminal",
  "My account or log in",
  "A payment or settlement",
  "My terminal (fault, swap, paper)",
  "The Driver Card",
  "A charge on my card (I am a passenger)",
  "Something else",
];

const input = "w-full rounded-lg border border-navy-900/10 bg-white px-4 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:outline-none focus:ring-2 focus:ring-green-400";
const label = "block text-[11px] font-bold uppercase tracking-wider text-navy-700 mb-1.5";

async function uploadFile(file) {
  const prep = await fetch("/api/charge-query/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "contact", fileName: file.name, contentType: file.type, size: file.size }),
  });
  const j = await prep.json().catch(() => ({}));
  if (!prep.ok) throw new Error(j.error || "Could not upload the file.");
  const put = await fetch(j.url, { method: "PUT", headers: { "Content-Type": file.type, "x-upsert": "false" }, body: file });
  if (!put.ok) throw new Error("The file did not upload. Try a smaller one, or send the message without it.");
  return { storagePath: j.path, fileName: j.fileName };
}

export default function ContactCTA() {
  const [form, setForm] = useState({ first: "", last: "", phone: "", email: "", topic: "", message: "" });
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [company, setCompany] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const passenger = form.topic === TOPICS[5];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.first.trim()) return setError("Please tell us your first name.");
    if (form.phone.replace(/\D/g, "").length < 8) return setError("Please give us a phone number we can call.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return setError("That email address does not look right.");
    if (!form.topic) return setError("Tell us what it is about, so the right person picks it up.");
    if (file && file.size > 10 * 1024 * 1024) return setError("That file is over 10 MB. A photo from your phone is fine — just not the original scan.");
    if (file && !/^(image\/jpeg|image\/png|application\/pdf)$/.test(file.type)) return setError("Please attach a JPG, PNG or PDF.");
    setStatus("sending");
    try {
      const documents = file ? [await uploadFile(file)] : [];
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken: token, company, documents }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error || "Something went wrong — please try again."); setStatus("idle"); return; }
      setStatus("sent");
    } catch (err) {
      setError(err.message || "Could not reach the server. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <section id="contact" className="tc-grid py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[.9fr_1.1fr] gap-10 lg:gap-16 items-start">
        {/* where to find us */}
        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>
            Right here when you need us, <span className="text-green-600">in Sydney</span>
          </h2>
          <p className="mt-4 text-navy-600 leading-relaxed">
            New to TaxiCharg, already driving with a terminal, or a passenger with a question about a fare &mdash; write to us here and a real person comes back to you by email or phone.
          </p>
          <div className="mt-7 space-y-3">
            {OFFICE.hours && (
              <div className="flex gap-4 rounded-xl bg-white border border-navy-900/5 card-shadow px-5 py-4"><Clock className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /><div className="text-navy-800">{OFFICE.hours}</div></div>
            )}
            <a href={`mailto:${OFFICE.email}`} className="flex gap-4 rounded-xl bg-white border border-navy-900/5 card-shadow px-5 py-4 hover:border-green-500 transition-colors"><Mail className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /><div className="font-semibold text-green-700">{OFFICE.email}</div></a>
            {OFFICE.phone && (
              <a href={`tel:${OFFICE.phone.replace(/\s/g, "")}`} className="flex gap-4 rounded-xl bg-white border border-navy-900/5 card-shadow px-5 py-4 hover:border-green-500 transition-colors"><Phone className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /><div><div className="font-semibold text-green-700">{OFFICE.phone}</div><div className="text-sm text-navy-500">The office, for drivers and passengers</div></div></a>
            )}
            <div className="flex gap-4 rounded-xl bg-white border border-navy-900/5 card-shadow px-5 py-4"><MapPin className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /><div><div className="font-semibold text-navy-900">Driver service centre</div><div className="text-navy-700">{OFFICE.address[0]}<br />{OFFICE.address[1]}</div><a href={OFFICE.maps} target="_blank" rel="noopener" className="inline-block mt-1.5 text-sm font-semibold text-green-600">Get directions &rarr;</a><div className="mt-1.5 text-sm text-navy-500">Terminals are collected and swapped here.</div></div></div>
          </div>
          <div className="mt-7 rounded-xl bg-green-50 border border-green-600/15 px-5 py-4 text-sm text-navy-700">
            <div className="font-bold text-navy-900 mb-1">Quicker than a message</div>
            <Link href="/support/query-a-charge" className="block text-green-700 font-semibold">A taxi charge on your card that looks wrong &rarr;</Link>
            <Link href="/support/receipt-search" className="block text-green-700 font-semibold mt-1">A copy of a receipt &rarr;</Link>
            <Link href="/forgot" className="block text-green-700 font-semibold mt-1">Forgotten your password &rarr;</Link>
          </div>
        </Reveal>

        {/* the form */}
        <Reveal delay={0.12}>
          {status === "sent" ? (
            <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-8 sm:p-10 text-center">
              <span className="mx-auto w-14 h-14 rounded-full brand-gradient flex items-center justify-center"><Check className="w-7 h-7 text-white" /></span>
              <h3 className="mt-5 text-2xl font-extrabold text-navy-900">Thanks, {form.first.trim()} &mdash; we have your message</h3>
              <p className="mt-3 text-navy-600 leading-relaxed">We have emailed a copy to {form.email.trim()}. One of the team will come back to you by email or on {form.phone.trim()}.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="relative rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 sm:p-8">
              <h3 className="text-xl sm:text-2xl font-extrabold text-navy-900"><span className="text-green-600">Fill in the form</span> and we will get back to you</h3>
              <p className="mt-1.5 text-sm text-navy-500">Fields marked * are needed so we can reply.</p>

              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <div><label className={label}>First name *</label><input required className={input} value={form.first} onChange={set("first")} autoComplete="given-name" /></div>
                <div><label className={label}>Last name</label><input className={input} value={form.last} onChange={set("last")} autoComplete="family-name" /></div>
                <div><label className={label}>Contact number *</label><input required type="tel" className={input} value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="04xx xxx xxx" /></div>
                <div><label className={label}>Email address *</label><input required type="email" className={input} value={form.email} onChange={set("email")} autoComplete="email" /></div>
                <div className="sm:col-span-2"><label className={label}>What is it about? *</label>
                  <select required className={input} value={form.topic} onChange={set("topic")}>
                    <option value="">Choose one</option>
                    {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {passenger && (
                    <p className="mt-2 text-sm text-navy-700 bg-green-50 rounded-lg px-3 py-2">
                      For a charge on your card, the <Link href="/support/query-a-charge" className="font-semibold text-green-700 underline">Query a charge</Link> form is quicker &mdash; it gives you a reference you can track. You can still write to us here.
                    </p>
                  )}
                </div>
                <div className="sm:col-span-2"><label className={label}>Your message</label><textarea rows={5} className={input} value={form.message} onChange={set("message")} placeholder="Tell us what you need. Your plate or terminal ID helps if it is about a terminal." /></div>
                <div className="sm:col-span-2">
                  <label className={label}>Attach a photo or PDF <span className="normal-case font-medium text-navy-500">(optional)</span></label>
                  <label className="flex items-center gap-3 rounded-lg border border-dashed border-navy-900/20 bg-green-50/40 px-4 py-3 cursor-pointer hover:border-green-500">
                    <Paperclip className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-sm text-navy-700 truncate">{file ? file.name : "A receipt, a statement line or a screen — JPG, PNG or PDF, up to 10 MB"}</span>
                    <input type="file" className="sr-only" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={(e) => setFile(e.target.files[0] || null)} />
                  </label>
                </div>
              </div>

              <Honeypot value={company} onChange={setCompany} />
              <div className="mt-4"><Turnstile onToken={setToken} /></div>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={status === "sending"} className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold red-gradient disabled:opacity-60">
                {status === "sending" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {status === "sending" ? "Sending…" : "Send message"}
              </button>
              <p className="mt-3 text-center text-xs text-navy-500">We handle your details under our <Link href="/legal/privacy" className="font-semibold text-green-700">Privacy Policy</Link>.</p>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}

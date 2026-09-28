"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import Reveal from "../motion/Reveal";
import Turnstile, { Honeypot } from "../Turnstile";

export default function ContactCTA() {
  const [status, setStatus] = useState("idle");
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [token, setToken] = useState("");
  const [company, setCompany] = useState("");
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken: token, company }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setErrorText(j.error || ""); throw new Error("Request failed"); }
      setStatus("sent");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="py-20 bg-navy-deep text-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to put more money in your pocket?
          </h2>
          <p className="mt-4 text-white/70">
            Leave your details and one of our driver specialists will call
            you back to get you set up on TaxiCharg.
          </p>
        </Reveal>

        <form onSubmit={handleSubmit} className="relative bg-white rounded-2xl p-6 sm:p-8 card-shadow space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              required
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <input
              required
              type="tel"
              placeholder="Phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <input
            required
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <textarea
            placeholder="Tell us a bit about your setup (optional)"
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <Honeypot value={company} onChange={setCompany} />
          <Turnstile onToken={setToken} />
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold red-gradient transition-opacity disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {status === "sending" ? "Sending..." : "Contact Sales"}
          </button>
          {status === "sent" && (
            <p className="text-sm text-green-600 text-center">
              Thanks! We&apos;ll be in touch shortly.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-600 text-center">
              {errorText || "Something went wrong \u2014 please try again."}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

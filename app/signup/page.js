"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, PartyPopper } from "lucide-react";
import AuthCard from "@/components/site/AuthCard";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", plate: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthCard title="Application received" subtitle="We'll be in touch shortly.">
        <div className="rounded-xl bg-orange-50 p-5 text-navy-700 text-sm flex gap-3">
          <PartyPopper className="w-5 h-5 text-orange-500 shrink-0" />
          <p>
            Thanks, {form.name.split(" ")[0] || "driver"}! Our team will verify your details and
            set up your account. In the meantime you can explore the driver dashboard with our{" "}
            <Link href="/login" className="font-semibold text-orange-600">
              demo login
            </Link>
            .
          </p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Apply to drive with TaxiCharg"
      subtitle="Tell us a bit about you and we'll set up your account."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Full name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Phone</label>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">
            Taxi plate number <span className="text-navy-400 font-normal">(optional)</span>
          </label>
          <input
            value={form.plate}
            onChange={(e) => setForm({ ...form, plate: e.target.value })}
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit application
        </button>
      </form>
    </AuthCard>
  );
}

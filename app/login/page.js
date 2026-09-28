"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clock, Loader2, MailCheck, ShieldAlert } from "lucide-react";
import AuthCard from "@/components/site/AuthCard";
import Turnstile, { Honeypot } from "@/components/site/Turnstile";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [company, setCompany] = useState("");
  // the second step: the code from the email
  const [codeStep, setCodeStep] = useState(null); // { ticket, hint }
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);

  function finish() {
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken: token, company }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      if (data.step === "code") {
        setCodeStep({ ticket: data.ticket, hint: data.hint });
        return;
      }
      finish();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCode(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket: codeStep.ticket, code, remember }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        if (/expired|again/i.test(data.error || "")) { setCodeStep(null); setCode(""); }
        return;
      }
      finish();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (codeStep) {
    return (
      <AuthCard title="Check your email" subtitle={`We sent a six-digit code to ${codeStep.hint}. It works for ten minutes.`}>
        <form onSubmit={handleCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Log-in code</label>
            <input
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={7}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-navy-900/10 px-4 py-3 text-2xl tracking-[0.4em] text-center font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="000000"
            />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-navy-700">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 accent-[#03c963]" />
            Remember this device for 30 days
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold red-gradient transition-opacity disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MailCheck className="w-4 h-4" />}
            Continue
          </button>
          <p className="text-xs text-navy-400 text-center">
            No email? Check junk mail, or{" "}
            <button type="button" onClick={() => { setCodeStep(null); setCode(""); setError(""); }} className="font-semibold text-green-600">
              go back and log in again
            </button>
            .
          </p>
        </form>
      </AuthCard>
    );
  }


  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your TaxiCharg driver dashboard."
      footer={
        <>
          New to TaxiCharg?{" "}
          <Link href="/signup" className="font-semibold text-green-600 hover:text-green-700">
            Apply to join
          </Link>
        </>
      }
    >
      {params.get("reason") === "session-replaced" && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-amber-50 text-amber-800 px-3.5 py-3 text-sm">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>You were signed out because this account was signed in on another device or terminal.</span>
        </div>
      )}

      {params.get("reason") === "password-set" && (
        <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 px-3.5 py-3 text-sm">Your new password is saved. Log in with it now.</div>
      )}

      {params.get("reason") === "idle-timeout" && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-navy-950/[0.05] text-navy-700 px-3.5 py-3 text-sm">
          <Clock className="w-4 h-4 mt-0.5 shrink-0" />
          <span>You were signed out after 10 minutes of inactivity, for your security.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 relative">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Email</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Password</label>
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            placeholder="••••••••"
          />
        </div>

        <Honeypot value={company} onChange={setCompany} />
        <Turnstile onToken={setToken} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold red-gradient transition-opacity disabled:opacity-60"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Log in
        </button>

        <p className="text-xs text-navy-400 text-center">
          For your security, this account can only be signed in on one device at a time.
        </p>
      </form>

      <p className="mt-5 text-center text-sm">
        <Link href="/forgot" className="font-semibold text-green-600 hover:text-green-700">Forgot your password?</Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Loader2, ShieldAlert } from "lucide-react";
import Logo from "@/components/site/Logo";
import Turnstile, { Honeypot } from "@/components/site/Turnstile";

/**
 * Log in (28 Sept): one question - "What's your phone number or email?" -
 * then the six-digit code we sent, by text or by email. A password is still
 * there for anyone who wants it (email only), and the code follows the
 * password too unless this device is remembered. One device at a time.
 */
const input = "w-full rounded-lg border-2 border-navy-900/15 bg-navy-950/[0.03] px-4 py-3.5 text-base text-navy-900 placeholder:text-navy-400 focus:outline-none focus:border-navy-deep focus:bg-white";
const primary = "w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold red-gradient disabled:opacity-60";
const secondary = "w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-navy-900 bg-navy-950/[0.06] hover:bg-navy-950/[0.1]";

function post(url, body) {
  return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => [r.ok, await r.json().catch(() => ({}))]);
}

function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState("who"); // who | code | password
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [sent, setSent] = useState(null); // { ticket, via, hint, canPassword, email }
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [company, setCompany] = useState("");

  function finish() { router.push(params.get("next") || "/dashboard"); router.refresh(); }
  async function run(fn) { setError(""); setBusy(true); try { await fn(); } catch { setError("Could not reach the server. Please try again."); } finally { setBusy(false); } }

  const start = () => run(async () => {
    if (!identifier.trim()) return setError("Type your phone number or email.");
    const [ok, j] = await post("/api/auth/start", { identifier: identifier.trim(), turnstileToken: token, company });
    if (!ok) return setError(j.error || "Something went wrong.");
    setSent(j); setCode("");
    setStep(j.via === "password" ? "password" : "code");
  });
  const verify = () => run(async () => {
    const [ok, j] = await post("/api/auth/verify-code", { ticket: sent.ticket, code, remember });
    if (!ok) { setError(j.error || "Something went wrong."); if (/expired|again/i.test(j.error || "")) setStep("who"); return; }
    finish();
  });
  const withPassword = () => run(async () => {
    const [ok, j] = await post("/api/auth/login", { email: sent?.email || identifier.trim(), password, turnstileToken: token, company });
    if (!ok) return setError(j.error || "Something went wrong.");
    if (j.step === "code") { setSent({ ticket: j.ticket, via: "email", hint: j.hint, canPassword: false, email: sent?.email || identifier.trim() }); setCode(""); setStep("code"); return; }
    finish();
  });

  const reason = params.get("reason");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-navy-deep">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><Logo dark className="text-lg" /></Link>
          <Link href="/signup" className="text-sm font-semibold text-white/80 hover:text-white">New here? Apply to join</Link>
        </div>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-sm">
          {reason === "session-replaced" && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-amber-50 text-amber-800 px-3.5 py-3 text-sm"><ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" /><span>You were signed out because this account was signed in on another device or terminal.</span></div>
          )}
          {reason === "password-set" && <div className="mb-5 rounded-lg bg-emerald-50 text-emerald-800 px-3.5 py-3 text-sm">Your new password is saved. Log in now.</div>}
          {reason === "idle-timeout" && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-navy-950/[0.05] text-navy-700 px-3.5 py-3 text-sm"><Clock className="w-4 h-4 mt-0.5 shrink-0" /><span>You were signed out after 10 minutes of inactivity, for your security.</span></div>
          )}

          {step === "who" && (
            <form onSubmit={(e) => { e.preventDefault(); start(); }} className="relative space-y-4">
              <h1 className="text-2xl font-bold text-navy-900 leading-snug">What&rsquo;s your phone number or email?</h1>
              <input autoFocus required autoComplete="username" inputMode="email" className={input} placeholder="Enter phone number or email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
              <Honeypot value={company} onChange={setCompany} />
              <Turnstile onToken={setToken} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className={primary}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Continue</button>
              <p className="text-xs text-navy-500 leading-relaxed pt-2">By continuing you agree to receive a one-time log-in code by text message or email. Message and data rates may apply. This account can be signed in on one device at a time.</p>
            </form>
          )}

          {step === "code" && sent && (
            <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-4">
              <button type="button" onClick={() => { setStep("who"); setError(""); }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy-900"><ArrowLeft className="w-4 h-4" /> Back</button>
              <h1 className="text-2xl font-bold text-navy-900 leading-snug">Enter the 6-digit code we {sent.via === "sms" ? "texted" : "emailed"} to {sent.hint}</h1>
              <input autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} className={`${input} text-2xl tracking-[0.4em] text-center font-bold tabular-nums`} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} />
              <label className="flex items-center gap-2.5 text-sm text-navy-700"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4 accent-[#16a34a]" /> Remember this device for 30 days</label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className={primary}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Continue</button>
              <div className="flex items-center justify-between text-sm pt-1">
                <button type="button" onClick={() => setStep("who")} className="font-semibold text-navy-700 hover:text-navy-900">Resend code</button>
                {sent.canPassword && <button type="button" onClick={() => { setStep("password"); setError(""); }} className="font-semibold text-green-700 hover:text-green-800">Use password instead</button>}
              </div>
              <p className="text-xs text-navy-500">{sent.via === "sms" ? "No text? Check the number is the one on your account, or go back and use your email." : "No email? Check junk mail, or go back and try again."}</p>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={(e) => { e.preventDefault(); withPassword(); }} className="space-y-4">
              <button type="button" onClick={() => { setStep(sent?.ticket ? "code" : "who"); setError(""); }} className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy-900"><ArrowLeft className="w-4 h-4" /> Back</button>
              <h1 className="text-2xl font-bold text-navy-900 leading-snug">Enter your password</h1>
              <p className="text-sm text-navy-500">for {sent?.email || identifier}</p>
              <input autoFocus required type="password" autoComplete="current-password" className={input} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={busy} className={primary}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Log in</button>
              {sent?.ticket && <button type="button" onClick={() => { setStep("code"); setError(""); }} className={secondary}>Use the code instead</button>}
              <p className="text-sm text-center pt-1"><Link href="/forgot" className="font-semibold text-green-700 hover:text-green-800">Forgot your password?</Link></p>
            </form>
          )}
        </div>
      </main>

      <footer className="px-4 py-6 text-center text-xs text-navy-400">&copy; {new Date().getFullYear()} TaxiCharg &middot; NSW, Australia &middot; <Link href="/legal/privacy" className="hover:text-navy-600">Privacy</Link></footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginFlow />
    </Suspense>
  );
}

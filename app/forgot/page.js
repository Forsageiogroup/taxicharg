"use client";
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import AuthCard from "@/components/site/AuthCard";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault(); setLoading(true); setMsg("");
    const r = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json().catch(() => ({}));
    setMsg(j.message || "If that address is on our records, a reset link is on its way.");
    setLoading(false);
  }
  return (
    <AuthCard title="Forgot your password?" subtitle="Type the email you signed up with and we will send a link to choose a new one."
      footer={<Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600">Back to log in</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
          className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        {msg && <p className="text-sm text-navy-700">{msg}</p>}
        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Send the link
        </button>
      </form>
    </AuthCard>
  );
}

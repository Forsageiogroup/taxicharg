"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Loader2, ShieldCheck } from "lucide-react";
import AuthCard from "@/components/site/AuthCard";
import { DEMO_ADMIN_CREDENTIALS } from "@/lib/demoCredentials";

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setForm({ email: DEMO_ADMIN_CREDENTIALS.email, password: DEMO_ADMIN_CREDENTIALS.password });
  }

  return (
    <AuthCard
      title={
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-orange-500" /> Admin sign in
        </span>
      }
      subtitle="Back-office access for the TaxiCharg team."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Password</label>
          <input
            required
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Sign in
        </button>
      </form>

      <button
        onClick={fillDemo}
        type="button"
        className="mt-5 w-full flex items-center gap-2 text-xs text-navy-500 bg-navy-950/[0.03] rounded-lg px-3 py-2.5 hover:bg-navy-950/[0.06]"
      >
        <Info className="w-3.5 h-3.5 shrink-0" />
        Demo mode: click to fill demo admin credentials
      </button>
    </AuthCard>
  );
}

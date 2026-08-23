"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Info, Loader2 } from "lucide-react";
import AuthCard from "@/components/site/AuthCard";
import { DEMO_DRIVER_CREDENTIALS } from "@/lib/demoCredentials";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setForm({ email: DEMO_DRIVER_CREDENTIALS.email, password: DEMO_DRIVER_CREDENTIALS.password });
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your TaxiCharg driver dashboard."
      footer={
        <>
          New to TaxiCharg?{" "}
          <Link href="/signup" className="font-semibold text-orange-500 hover:text-orange-600">
            Apply to join
          </Link>
        </>
      }
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
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Log in
        </button>
      </form>

      <button
        onClick={fillDemo}
        type="button"
        className="mt-5 w-full flex items-center gap-2 text-xs text-navy-500 bg-navy-950/[0.03] rounded-lg px-3 py-2.5 hover:bg-navy-950/[0.06]"
      >
        <Info className="w-3.5 h-3.5 shrink-0" />
        Demo mode: click to fill demo driver credentials
      </button>
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

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AuthCard from "@/components/site/AuthCard";

/**
 * Arrived at from the login / reset email. The token is in the address
 * (?t=...&k=invite|recovery) and is only spent when Save is pressed, so a
 * mail scanner opening the link in the background cannot use it up.
 * Older links carried the session in the address after #; still accepted.
 */
export default function ResetPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [kind, setKind] = useState("");
  const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (q.get("t")) { setToken(q.get("t")); setKind(q.get("k") || "recovery"); }
    else { setToken(h.get("access_token") || ""); setKind("session"); }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  async function submit(e) {
    e.preventDefault(); setErr("");
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords do not match.");
    setLoading(true);
    const r = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kind === "session" ? { accessToken: token, password: pw } : { tokenHash: token, kind, password: pw }) });
    const j = await r.json().catch(() => ({}));
    setLoading(false);
    if (!r.ok) return setErr(j.error || "Could not save that.");
    router.push("/login?reason=password-set");
  }
  return (
    <AuthCard title="Choose a new password" subtitle="At least 8 characters. You will use it to log in from now on.">
      {!token ? <p className="text-sm text-red-600">This link has expired or was already used. Ask for a new one from the log in page.</p> : (
        <form onSubmit={submit} className="space-y-4">
          <input required type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" autoComplete="new-password"
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          <input required type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Type it again" autoComplete="new-password"
            className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save and log in
          </button>
        </form>
      )}
    </AuthCard>
  );
}

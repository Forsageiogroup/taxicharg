"use client";

import { useState } from "react";
import { Check, Copy, Gift, Share2 } from "lucide-react";

/**
 * Refer a friend, on the Overview (28 Sept). The driver's code, the share
 * link, a copy button and Share on a phone, and every friend they have
 * referred with where each one stands. Nothing here is a claim - the
 * amounts come from the offer, the stages from the wallet.
 */
const STAGE = {
  signed_up: ["Signed up", "Waiting for the office to set them up"],
  waiting_for_terminal: ["Set up", "Waiting for their terminal"],
  in_progress: ["Driving", "Counting fares"],
  qualified: ["Qualified", "Bonus on its way"],
  paid: ["Paid", "Both bonuses paid"],
  expired: ["Window closed", "Did not reach the target in time"],
  declined: ["Not eligible", ""],
};
const aud = (n) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);

export default function ReferralCard({ code, link, offer, referrals }) {
  const [copied, setCopied] = useState("");
  async function copy(what, text) {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1800); } catch {}
  }
  async function share() {
    const text = `Join me on TaxiCharg - use my code ${code} when you sign up and we both get ${aud(offer.bonus)}. ${link}`;
    if (navigator.share) { try { await navigator.share({ title: "Join TaxiCharg", text, url: link }); } catch {} }
    else copy("link", link);
  }
  const paid = referrals.filter((r) => r.stage === "paid").length;

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow overflow-hidden">
      <div className="relative bg-navy-deep text-white px-6 py-5">
        <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full brand-gradient opacity-25 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold text-neon">Refer a friend</div>
            <h2 className="mt-1 text-xl font-extrabold">Give {aud(offer.bonus)}, get {aud(offer.bonus)}</h2>
            <p className="mt-1 text-sm text-white/75 max-w-md">Your friend joins with your code and takes {aud(offer.threshold)} in card fares within {offer.windowDays} days of getting their terminal. You both get {aud(offer.bonus)} in your TaxiCharg balance.</p>
          </div>
          <Gift className="w-8 h-8 text-neon shrink-0" />
        </div>
        {code ? (
          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <div className="rounded-lg bg-white/10 border border-white/15 px-4 py-2 font-mono text-lg font-bold tracking-widest">{code}</div>
            <button type="button" onClick={() => copy("code", code)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3.5 py-2 text-sm font-semibold">
              {copied === "code" ? <Check className="w-4 h-4 text-neon" /> : <Copy className="w-4 h-4" />} {copied === "code" ? "Copied" : "Copy code"}
            </button>
            <button type="button" onClick={() => copy("link", link)} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 px-3.5 py-2 text-sm font-semibold">
              {copied === "link" ? <Check className="w-4 h-4 text-neon" /> : <Copy className="w-4 h-4" />} {copied === "link" ? "Copied" : "Copy link"}
            </button>
            <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-full red-gradient px-4 py-2 text-sm font-semibold">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        ) : (
          <p className="relative mt-4 text-sm text-white/75">Your code is on its way &mdash; ask the office if it has not appeared by tomorrow.</p>
        )}
      </div>
      <div className="px-6 py-4">
        {referrals.length === 0 ? (
          <p className="text-sm text-navy-500">Nobody has used your code yet. Send the link to a driver you know &mdash; there is no limit to how many friends you can refer.</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-navy-900">{referrals.length} referred</span>
              <span className="text-navy-500">{paid} paid &middot; {aud(paid * offer.bonus)} earned</span>
            </div>
            <ul className="mt-3 divide-y divide-navy-900/5">
              {referrals.map((r) => {
                const [t, sub] = STAGE[r.stage] || [r.stage, ""];
                const pct = Math.min(100, Math.round((r.fares / r.threshold) * 100));
                return (
                  <li key={r.id} className="py-3 flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-navy-900 truncate">{r.name}</div>
                      <div className="text-xs text-navy-500">{t}{sub ? " · " + sub : ""}{r.stage === "in_progress" && r.windowEndsAt ? " · until " + new Date(r.windowEndsAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : ""}</div>
                      {(r.stage === "in_progress" || r.stage === "qualified") && (
                        <div className="mt-1.5 h-1.5 rounded-full bg-navy-900/8 overflow-hidden"><div className="h-full brand-gradient rounded-full" style={{ width: pct + "%" }} /></div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {r.stage === "paid" ? <span className="text-sm font-bold text-green-700">+{aud(r.bonus)}</span>
                        : r.stage === "in_progress" || r.stage === "qualified" ? <span className="text-xs text-navy-600 tabular-nums">{aud(r.fares)} / {aud(r.threshold)}</span>
                        : <span className="text-xs text-navy-400">&mdash;</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

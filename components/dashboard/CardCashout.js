"use client";
// tc-0016: Cash out - from his payout account to his bank, when he asks (the owner, 31 Oct).
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const currency = (n) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
const newId = () => "web" + Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");

export default function CardCashout({ available, ready }) {
  const router = useRouter();
  const [amount, setAmount] = useState(available > 0 ? available.toFixed(2) : "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const requestId = useMemo(newId, []);
  const cents = Math.round(Number(amount) * 100);
  const can = ready && !busy && Number.isFinite(cents) && cents >= 100 && cents <= Math.round(available * 100);

  async function go() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/driver/card/cashout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId, amountCents: cents }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ bad: true, text: j.error || "The cash out could not be made." }); setBusy(false); return; }
      setMsg({ bad: false, text: `${currency(j.payout.amount)} is on its way to your bank${j.payout.arrivesOn ? ` (expected ${j.payout.arrivesOn})` : ""}.` });
      router.refresh();
    } catch {
      setMsg({ bad: true, text: "No connection. Check your internet and try again." });
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
      <h2 className="font-bold text-navy-900">Cash out</h2>
      <p className="mt-1 text-sm text-navy-500">Send money from your TaxiCharg balance to your bank. Usually arrives in 1-2 business days.</p>
      <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <label className="flex-1">
          <span className="text-xs font-semibold text-navy-500">Amount (up to {currency(available)})</span>
          <div className="mt-1 flex items-center rounded-xl border border-navy-900/10 px-3">
            <span className="text-navy-400">$</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full py-3 px-2 outline-none text-lg font-bold text-navy-900" disabled={!ready || busy} />
          </div>
        </label>
        <button type="button" onClick={go} disabled={!can}
          className="px-6 py-3 rounded-full text-sm font-bold text-white brand-gradient disabled:opacity-40">
          {busy ? "Sending…" : "Cash out"}
        </button>
      </div>
      {!ready && <p className="mt-3 text-sm text-amber-800">Your payout account is not ready yet. Open Payout account and finish it.</p>}
      {ready && available <= 0 && <p className="mt-3 text-sm text-navy-500">Nothing is available yet. Card fares become available to cash out after a couple of days.</p>}
      {msg && <p className={`mt-3 text-sm ${msg.bad ? "text-red-700" : "text-green-700"}`}>{msg.text}</p>}
    </div>
  );
}

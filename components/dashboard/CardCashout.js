"use client";
// tc-0016: Cash out - from his payout account to his bank, when he asks (the owner, 31 Oct).
// tc-0018: he chooses each time - Instant (about 30 minutes, any day, fee 1% min $0.50 off his
// balance on top) or Free (1-2 business days, no fee). The owner, 31 Oct.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const currency = (n) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
const newId = () => "web" + Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
const feeOf = (cents, inst) => (cents > 0 ? Math.max(Math.round((inst?.feeMin || 0) * 100), Math.round((cents * (inst?.feePct || 0)) / 100)) : 0);
const feeWords = (inst) => `fee ${inst?.feePct ?? 1}%${inst?.feeMin ? ` (min ${currency(inst.feeMin)})` : ""}`;

export default function CardCashout({ available, ready, instant }) {
  const router = useRouter();
  const instantMax = instant?.on ? instant.max : 0;
  const [method, setMethod] = useState(instantMax > 0 || available <= 0 ? "instant" : "standard");
  const max = method === "instant" ? instantMax : available;
  const [amount, setAmount] = useState(max > 0 ? max.toFixed(2) : "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const requestId = useMemo(newId, []);
  const cents = Math.round(Number(amount) * 100);
  const okAmount = Number.isFinite(cents) && cents >= 100 && cents <= Math.round(max * 100);
  const can = ready && !busy && okAmount;
  const fee = method === "instant" && okAmount ? feeOf(cents, instant) / 100 : 0;

  function choose(m) {
    if (busy) return;
    setMethod(m); setMsg(null);
    const mm = m === "instant" ? instantMax : available;
    setAmount(mm > 0 ? mm.toFixed(2) : "");
  }

  async function go() {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/driver/card/cashout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: `${requestId}${method === "instant" ? "i" : "s"}`, amountCents: cents, method }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ bad: true, text: j.error || "The cash out could not be made." }); setBusy(false); return; }
      setMsg({ bad: false, text: j.payout.instant
        ? `${currency(j.payout.amount)} is on its way to your bank - usually within 30 minutes. Fee ${currency(j.payout.fee)}.`
        : `${currency(j.payout.amount)} is on its way to your bank${j.payout.arrivesOn ? ` (expected ${j.payout.arrivesOn})` : ""}.` });
      router.refresh();
    } catch {
      setMsg({ bad: true, text: "No connection. Check your internet and try again." });
      setBusy(false);
    }
  }

  const Option = ({ id, title, sub, upTo, off }) => (
    <button type="button" onClick={() => choose(id)} disabled={busy} aria-pressed={method === id}
      className={`flex-1 text-left rounded-xl border p-4 transition ${method === id ? "border-green-600 ring-2 ring-green-600/30 bg-green-50/40" : "border-navy-900/10 hover:border-navy-900/25"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold text-navy-900">{title}</span>
        <span className="text-sm font-bold text-navy-900 tabular-nums">{off ? "-" : `up to ${currency(upTo)}`}</span>
      </div>
      <div className="mt-1 text-xs text-navy-500">{sub}</div>
    </button>
  );

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">
      <h2 className="font-bold text-navy-900">Cash out</h2>
      <p className="mt-1 text-sm text-navy-500">Send money from your TaxiCharg balance to your bank. Choose how fast.</p>
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <Option id="instant" title="Instant" sub={`In your bank in about 30 minutes, any day · ${feeWords(instant)}`} upTo={instantMax} off={!instant?.on} />
        <Option id="standard" title="Free" sub="1-2 business days · no fee" upTo={available} />
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <label className="flex-1">
          <span className="text-xs font-semibold text-navy-500">Amount (up to {currency(max)})</span>
          <div className="mt-1 flex items-center rounded-xl border border-navy-900/10 px-3">
            <span className="text-navy-400">$</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full py-3 px-2 outline-none text-lg font-bold text-navy-900" disabled={!ready || busy} />
          </div>
        </label>
        <button type="button" onClick={go} disabled={!can}
          className="px-6 py-3 rounded-full text-sm font-bold text-white brand-gradient disabled:opacity-40">
          {busy ? "Sending…" : method === "instant" ? "Cash out now" : "Cash out free"}
        </button>
      </div>
      {ready && okAmount && method === "instant" && (
        <p className="mt-3 text-sm text-navy-700">You get <b>{currency(cents / 100)}</b> in your bank in about 30 minutes. Fee <b>{currency(fee)}</b> comes off your balance - <b>{currency(cents / 100 + fee)}</b> in all.</p>
      )}
      {ready && okAmount && method === "standard" && (
        <p className="mt-3 text-sm text-navy-700">You get <b>{currency(cents / 100)}</b> in your bank in 1-2 business days. No fee.</p>
      )}
      {!ready && <p className="mt-3 text-sm text-amber-800">Your payout account is not ready yet. Open Payout account and finish it.</p>}
      {ready && method === "instant" && instant?.note && <p className="mt-3 text-sm text-navy-500">{instant.note}</p>}
      {ready && method === "instant" && !instant && <p className="mt-3 text-sm text-navy-500">Instant cash out could not be checked just now. Try again in a minute.</p>}
      {ready && method === "standard" && available <= 0 && <p className="mt-3 text-sm text-navy-500">Nothing is free to cash out yet - card fares get here after a couple of days. Use Instant to get them now.</p>}
      {msg && <p className={`mt-3 text-sm ${msg.bad ? "text-red-700" : "text-green-700"}`}>{msg.text}</p>}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const currency = (n) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(n || 0));
const when = (d) => (d ? new Date(d).toLocaleString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "");
const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : `${Date.now()}${Math.random().toString(36).slice(2)}`).slice(0, 40);

/**
 * tc-0024: the scanned shift report - what is his and GET PAID (the owner, 10 Nov 2026: "QR scan only").
 * The Service Fee is never on his report (the owner, 10 Nov). Clover terminal: his fares, his commission, any
 * refund, To you. S710: only the number of payments and To you.
 * The TaxiCharg Driver Card: a second button, shown only when the office has switched the card on (368 setting
 * terminal.driver_card_payouts, and DRIVER_CARD_PAYOUTS=on on the site) - for when the card company is connected.
 */
export default function GetPaid({ pay: first, onAgain }) {
  const [pay, setPay] = useState(first || null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [paid, setPaid] = useState(null);
  const req = useRef(newId());

  if (!pay) return null;
  const t = pay.toPay || {};
  const again = <button type="button" onClick={onAgain} className="w-full rounded-xl border-2 border-green-600 bg-white px-4 py-3 text-sm font-bold text-green-700 hover:bg-green-50">SCAN ANOTHER REPORT</button>;

  async function getPaid(destination = "bank") {
    if (busy) return;
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/driver/takings-pay", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: pay.reportId, requestId: req.current, expect: t.amount, destination }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(j.error || "Try again."); return; }   // the same press id: trying again never pays twice
      if (j.ok) { setPaid(j.paid); return; }
      req.current = newId();
      if (j.pay) setPay(j.pay);
      setMsg(j.reason || "This report cannot be paid now.");
    } catch { setMsg("Check your connection and press GET PAID again."); }
    finally { setBusy(false); }
  }

  if (paid) {
    return (
      <div className="mt-5 space-y-4">
        <div className="flex flex-col items-center gap-1 py-4 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-600" />
          <p className="text-3xl font-extrabold text-navy-900 tabular-nums">{currency(paid.amount)}</p>
          <p className="font-bold text-navy-900">Paid</p>
          <p className="text-sm text-navy-500">{pay.number} · {when(paid.at)}</p>
        </div>
        {again}
      </div>
    );
  }

  if (!t.payments) {
    return (
      <div className="mt-5 space-y-4">
        {pay.lastPaid ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-bold">{pay.number} is already paid</p>
            <p>Paid {when(pay.lastPaid.at)} · {currency(pay.lastPaid.amount)}</p>
            <p>Nothing more to pay on this report.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-navy-900/10 bg-[#f6f7f9] p-4 text-sm text-navy-700">Nothing to pay on this report.</div>
        )}
        {pay.waiting > 0 && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm">
            <p className="font-bold text-green-700">A payment that came in late</p>
            <p className="text-navy-600">If a card payment of the shift reaches us after the scan, scan the same report again: only the new payment is paid.</p>
          </div>
        )}
        {msg && <p className="text-sm text-red-700" role="alert">{msg}</p>}
        {again}
      </div>
    );
  }

  const row = "flex justify-between py-1.5 tabular-nums";
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl border border-green-100 bg-white p-4 text-sm shadow-sm">
        {pay.lastPaid && <p className="mb-2 text-navy-500">Paid before on this report: {currency(pay.lastPaid.amount)}. Only the new payments are paid now.</p>}
        {pay.provider === "stripe" ? (
          <div className={row}><span>Card payments on it</span><b>{t.payments}</b></div>
        ) : (
          <>
            <div className={row}><span>Fares on it</span><b>{t.payments} · {currency(t.fares)}</b></div>
            <div className={row}><span>Your commission</span><b>{t.commission > 0 ? "+ " : ""}{currency(t.commission)}</b></div>
            {t.refunded > 0 && <div className={row}><span>Refunded</span><b>− {currency(t.refunded)}</b></div>}
          </>
        )}
        <div className="mt-2 flex justify-between border-t border-navy-900/10 pt-3 text-lg tabular-nums"><b>To you</b><b>{currency(t.amount)}</b></div>
      </div>
      <button type="button" onClick={() => getPaid("bank")} disabled={busy}
        className="w-full rounded-xl bg-green-600 px-4 py-4 text-base font-extrabold text-white hover:bg-green-700 disabled:opacity-60">
        {busy ? <span className="inline-flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Paying…</span> : `GET PAID ${currency(t.amount)}`}
      </button>
      {pay.cardOn && (
        <button type="button" onClick={() => getPaid("card")} disabled={busy}
          className="w-full rounded-xl border-2 border-green-600 bg-white px-4 py-3 text-sm font-bold text-green-700 hover:bg-green-50 disabled:opacity-60">
          SEND TO MY DRIVER CARD
        </button>
      )}
      {msg && <p className="text-sm text-red-700" role="alert">{msg}</p>}
    </div>
  );
}

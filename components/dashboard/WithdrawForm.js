"use client";

import { useState } from "react";
import { Loader2, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default function WithdrawForm({ availableBalance, stripeConnected }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/driver/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Withdrawal failed.");
        return;
      }
      setResult(data);
      setAmount("");
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl brand-gradient flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </span>
          <div>
            <p className="text-sm text-navy-500">Available to withdraw</p>
            <p className="text-2xl font-extrabold text-navy-900">{currency(availableBalance)}</p>
          </div>
        </div>

        {!stripeConnected && (
          <p className="mt-4 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            Stripe isn&apos;t connected yet, so withdrawals will run in demo mode. Connect Stripe
            from the Connect tab to send real payouts to your bank.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1.5">Amount (AUD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-400">$</span>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                max={availableBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-navy-900/10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="0.00"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAmount(String(availableBalance.toFixed(2)))}
            className="text-xs font-semibold text-orange-500 hover:text-orange-600"
          >
            Withdraw full balance
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Withdraw {amount ? currency(Number(amount) || 0) : ""}
          </button>
        </form>

        {result && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Withdrawal requested</p>
              <p>
                {currency(result.payout.amount)} is on its way
                {result.payout.arrivalEstimate ? ` (${result.payout.arrivalEstimate})` : ""}.
                {result.mode === "demo" && " This ran in demo mode — no real funds were moved."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-navy-950/[0.02] border border-navy-900/5 p-6">
        <h3 className="font-bold text-navy-900 text-sm">How withdrawals work</h3>
        <ul className="mt-3 space-y-3 text-sm text-navy-600">
          <li>Only settled fares count toward your available balance.</li>
          <li>Connected via Stripe: funds arrive in 1&ndash;2 business days.</li>
          <li>Not yet connected: withdrawals run in demo mode until Stripe is linked.</li>
          <li>No withdrawal fees from TaxiCharg.</li>
        </ul>
      </div>
    </div>
  );
}

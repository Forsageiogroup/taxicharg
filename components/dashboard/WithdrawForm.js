"use client";

import { useState } from "react";
import { Loader2, Wallet, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";

const currency = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);

export default function WithdrawForm({ availableBalance, accountBalance, stripeConnected }) {
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showTip, setShowTip] = useState(false);

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
      setFormOpen(false);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFormOpen((v) => !v)}
            className="px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90"
          >
            Withdraw funds now
          </button>
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              onClick={() => setShowTip((v) => !v)}
              className="w-8 h-8 rounded-full border border-navy-900/10 flex items-center justify-center text-navy-400 hover:text-orange-500"
              aria-label="Withdrawal info"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            {showTip && (
              <div className="absolute left-0 top-10 w-64 rounded-xl bg-white card-shadow border border-navy-900/5 p-4 text-xs text-navy-600 z-10">
                Only settled fares count toward what you can withdraw. Once your bank payouts are
                connected, funds typically arrive in 1&ndash;2 business days. No withdrawal fees
                from TaxiCharg.
              </div>
            )}
          </div>
        </div>

        {!stripeConnected && (
          <p className="mt-4 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            Withdrawals are paid by bank transfer to the account we have on file for you,
            usually within 1&ndash;2 business days. Contact support if your bank details change.
          </p>
        )}

        {formOpen && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4 max-w-sm">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">Amount (AUD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-400">$</span>
                <input
                  required
                  autoFocus
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
              <p className="mt-1.5 text-xs text-navy-400">
                Available to withdraw: {currency(availableBalance)}
              </p>
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
              Confirm withdrawal
            </button>
          </form>
        )}

        {result && (
          <div className="mt-6 flex items-start gap-3 rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Withdrawal requested</p>
              <p>
                {currency(result.payout.amount)} is on its way
                {result.payout.arrivalEstimate ? ` (${result.payout.arrivalEstimate})` : ""}.
                {result.mode === "office" && " You will see it under Settlements once it is paid."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-navy-900 font-bold">
            <Wallet className="w-4 h-4" /> Your account
          </div>
          <span className="text-sm text-navy-500 mt-2 block">Account balance</span>
          <div className="mt-1 text-2xl font-extrabold text-navy-900">{currency(accountBalance)}</div>
          <p className="text-xs text-navy-400 mt-1">Money in your account pending withdrawal</p>
        </div>
      </div>
    </div>
  );
}

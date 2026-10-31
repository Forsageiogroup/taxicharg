"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
  ConnectAccountManagement,
  ConnectNotificationBanner,
} from "@stripe/react-connect-js";

/**
 * tc-0012 (31 Oct 2026): the driver's own TaxiCharg payout account.
 *
 *   1. Not open yet  → the payout terms, a tick box, "Open my payout account".
 *   2. Opened        → the details form (identity, bank account) right here,
 *                      in TaxiCharg colours, no separate login.
 *   3. Ready         → "Ready to receive fares", his details, and any notice
 *                      when something more is needed.
 *
 * The form's session comes from /api/stripe/account-session, which reads his
 * account from his TaxiCharg login on the server.
 */

const GREEN = "#16a34a";
const NAVY = "#141a25";

async function fetchClientSecret() {
  const res = await fetch("/api/stripe/account-session", { method: "POST" });
  if (!res.ok) return undefined;
  const { client_secret } = await res.json();
  return client_secret;
}

function useConnect(publishableKey, enabled) {
  const [instance, setInstance] = useState(null);
  useEffect(() => {
    if (!enabled || !publishableKey || instance) return;
    setInstance(
      loadConnectAndInitialize({
        publishableKey,
        fetchClientSecret,
        locale: "en-AU",
        appearance: {
          overlays: "drawer",
          variables: {
            colorPrimary: GREEN,
            colorText: NAVY,
            buttonPrimaryColorBackground: GREEN,
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            borderRadius: "10px",
          },
        },
      })
    );
  }, [enabled, publishableKey, instance]);
  return instance;
}

function Card({ children }) {
  return <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6">{children}</div>;
}

function Note({ tone = "amber", icon: Icon = AlertTriangle, children }) {
  const tones = {
    amber: "text-amber-800 bg-amber-50",
    green: "text-green-800 bg-green-50",
    red: "text-red-700 bg-red-50",
  };
  return (
    <p className={`flex items-start gap-2 text-sm rounded-lg px-4 py-3 ${tones[tone]}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function Terms({ termsVersion, onOpened }) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function open() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept: true, termsVersion }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      onOpened(data.account);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-bold text-navy-900 text-lg">Open your payout account</h2>
      <ul className="mt-3 space-y-2 text-sm text-navy-600 list-disc pl-5 max-w-prose">
        <li>Card fares you take on a TaxiCharg terminal are paid into this account after each trip.</li>
        <li>You withdraw from it to your own bank account.</li>
        <li>You will be asked for your name, date of birth, address, ID and bank details, so the account can be checked. It takes about five minutes.</li>
        <li>Only TaxiCharg can refund a passenger. If a fare is refunded or disputed, your share of it is taken back.</li>
      </ul>

      <label className="mt-5 flex items-start gap-3 text-sm text-navy-700 max-w-prose">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 h-4 w-4 accent-green-600"
        />
        <span>
          I agree to the{" "}
          <a href="/legal/terms" target="_blank" rel="noopener" className="underline">TaxiCharg terms</a>{" "}
          and the{" "}
          <a href="https://stripe.com/au/legal/connect-account" target="_blank" rel="noopener noreferrer" className="underline">
            Connected Account Agreement
          </a>{" "}
          of TaxiCharg&apos;s payment provider, which holds and pays out the money in this account.
        </span>
      </label>

      {error && <div className="mt-4"><Note tone="red">{error}</Note></div>}

      <button
        onClick={open}
        disabled={!agreed || busy}
        className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white brand-gradient disabled:opacity-50"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Open my payout account
      </button>
    </Card>
  );
}

function StatusLine({ account }) {
  if (account.status === "ready") {
    return <Note tone="green" icon={CheckCircle2}>Ready to receive fares. Your payout account is checked and active.</Note>;
  }
  if (account.status === "restricted") {
    return <Note tone="red">Your payout account is on hold. Contact TaxiCharg support.</Note>;
  }
  if (account.status === "closed") {
    return <Note tone="red">This payout account is closed. Contact TaxiCharg support.</Note>;
  }
  return (
    <Note icon={Clock}>
      {account.requirementsDue > 0
        ? "A few details are still needed before fares can be paid to you. Fill them in below."
        : "Thanks - your details are being checked. This page updates when it is done."}
    </Note>
  );
}

export default function PayoutAccount({ publishableKey }) {
  const [state, setState] = useState({ loading: true });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/account", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Payout accounts are not available right now.");
      setState({ loading: false, ...data });
    } catch (err) {
      setState({ loading: false, error: err.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const account = state.account;
  const connect = useConnect(publishableKey, Boolean(account && account.status !== "closed"));

  if (state.loading) {
    return <Card><p className="flex items-center gap-2 text-sm text-navy-500"><Loader2 className="w-4 h-4 animate-spin" />Loading…</p></Card>;
  }
  if (state.error) return <Card><Note tone="red">{state.error}</Note></Card>;
  if (!state.configured) return <Card><Note>Payout accounts are not switched on yet. Contact TaxiCharg support.</Note></Card>;
  if (!account && !state.eligible) {
    return <Card><Note>Your TaxiCharg account needs to be approved before you can open a payout account. Contact TaxiCharg support.</Note></Card>;
  }
  if (!account) return <Terms termsVersion={state.termsVersion} onOpened={() => load()} />;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-bold text-navy-900 text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" /> Your payout account
          </h2>
          {!account.livemode && (
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 rounded-full px-3 py-1">Test account</span>
          )}
        </div>
        <div className="mt-4"><StatusLine account={account} /></div>
        <button onClick={load} className="mt-4 text-sm font-medium text-green-700 underline">Check again</button>
      </Card>

      {connect && account.status !== "closed" && (
        <ConnectComponentsProvider connectInstance={connect}>
          <ConnectNotificationBanner collectionOptions={{ fields: "eventually_due", futureRequirements: "include" }} />
          <Card>
            {account.status === "ready" ? (
              <ConnectAccountManagement collectionOptions={{ fields: "eventually_due", futureRequirements: "include" }} />
            ) : (
              <ConnectAccountOnboarding
                skipTermsOfServiceCollection
                collectionOptions={{ fields: "eventually_due", futureRequirements: "include" }}
                fullTermsOfServiceUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/legal/terms`}
                privacyPolicyUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/legal/privacy`}
                onExit={() => load()}
              />
            )}
          </Card>
        </ConnectComponentsProvider>
      )}
    </div>
  );
}

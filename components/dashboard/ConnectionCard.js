"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import StatusPill from "./StatusPill";

export default function ConnectionCard({
  name,
  description,
  connected,
  detail,
  connectHref,
  disconnectHref,
  configured,
  envVarsNeeded = [],
}) {
  const [loading, setLoading] = useState(false);

  async function handleDisconnect() {
    setLoading(true);
    try {
      await fetch(disconnectHref, { method: "POST" });
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-navy-900 text-lg">{name}</h3>
          <StatusPill status={connected ? "connected" : "disconnected"} />
        </div>
        {connected ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : (
          <XCircle className="w-6 h-6 text-navy-300" />
        )}
      </div>

      <p className="mt-3 text-sm text-navy-500 flex-1">{description}</p>
      {detail && <p className="mt-2 text-xs text-navy-400">{detail}</p>}

      {!configured && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Not configured yet. Add {envVarsNeeded.join(" and ")} in your environment variables to
          enable a live connection.
        </p>
      )}

      <div className="mt-5">
        {connected ? (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-navy-900/10 hover:bg-navy-950/[0.03] disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Disconnect
          </button>
        ) : (
          <a
            href={connectHref}
            className="w-full flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold text-white brand-gradient hover:opacity-90"
          >
            Connect {name}
          </a>
        )}
      </div>
    </div>
  );
}

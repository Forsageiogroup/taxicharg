"use client";

import { useState } from "react";
import { Loader2, KeyRound } from "lucide-react";

/** tc-0019: set or change the 4-digit PIN for the driver menu on his terminal. */
export default function TerminalPin({ isSet }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: false, text: "" });
  const [done, setDone] = useState(isSet);

  async function save(e) {
    e.preventDefault();
    if (!/^[0-9]{4}$/.test(pin)) { setMsg({ ok: false, text: "The PIN is 4 digits." }); return; }
    if (pin !== pin2) { setMsg({ ok: false, text: "The two PINs are not the same." }); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/driver/terminal-pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin, pin2 }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { setDone(true); setOpen(false); setPin(""); setPin2(""); setMsg({ ok: true, text: "Saved. Use it to open the menu on your terminal." }); }
      else setMsg({ ok: false, text: j.error || "Not saved. Try again." });
    } catch { setMsg({ ok: false, text: "Not saved. Check your connection and try again." }); }
    finally { setBusy(false); }
  }

  const box = "w-24 text-center tracking-[0.5em] font-mono text-lg font-semibold text-navy-900 border border-navy-900/10 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-400";
  return (
    <div>
      <p className="text-xs text-navy-400">Terminal PIN</p>
      {!open ? (
        <div className="flex items-center gap-3 mt-0.5">
          <p className="font-semibold text-navy-900">{done ? "Set" : "Not set"}</p>
          <button type="button" onClick={() => { setOpen(true); setMsg({ ok: false, text: "" }); }} className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 hover:text-green-700">
            <KeyRound className="w-3.5 h-3.5" /> {done ? "Change" : "Set PIN"}
          </button>
        </div>
      ) : (
        <form onSubmit={save} className="mt-1 flex flex-wrap items-end gap-3">
          <label className="text-xs text-navy-500">New PIN<br />
            <input inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className={box} type="password" />
          </label>
          <label className="text-xs text-navy-500">Again<br />
            <input inputMode="numeric" autoComplete="off" maxLength={4} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} className={box} type="password" />
          </label>
          <button disabled={busy} className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </button>
          <button type="button" onClick={() => { setOpen(false); setPin(""); setPin2(""); setMsg({ ok: false, text: "" }); }} className="text-sm text-navy-500 hover:text-navy-700 py-2">Cancel</button>
        </form>
      )}
      {msg.text ? <p className={`text-xs mt-1 ${msg.ok ? "text-green-700" : "text-red-600"}`} role={msg.ok ? undefined : "alert"}>{msg.text}</p>
        : <p className="text-xs text-navy-400 mt-1">4 digits, for the menu on your terminal. Not your cab-tablet PIN. Easy ones like 1111 or 1234 are not accepted.</p>}
    </div>
  );
}

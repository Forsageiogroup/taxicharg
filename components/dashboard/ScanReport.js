"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Keyboard, Loader2, CheckCircle2, XCircle } from "lucide-react";
import GetPaid from "@/components/dashboard/GetPaid";

const currency = (n) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(n || 0));
const time = (d) => (d ? new Date(d).toLocaleString("en-AU", { timeZone: "Australia/Sydney", day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const LABEL = {
  credited_now: ["Added now", "text-green-700 bg-green-50"],
  already_in: ["Already in", "text-navy-700 bg-navy-50"],
  voided: ["Voided / refunded", "text-amber-800 bg-amber-50"],
  not_seen: ["Checking", "text-navy-500 bg-navy-50"],
  not_credited: ["Checking", "text-navy-500 bg-navy-50"],
  not_found: ["Not found - the office checks it", "text-red-700 bg-red-50"],
  other_driver: ["Another driver's - the office checks it", "text-red-700 bg-red-50"],
  refused: ["Not from this terminal - the office checks it", "text-red-700 bg-red-50"],
};

/** tc-0019: camera (where the phone's browser can read QR codes), a photo of the report, or the number typed. */
export default function ScanReport() {
  const [mode, setMode] = useState(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);
  const [canRead, setCanRead] = useState(true);
  const video = useRef(null), stream = useRef(null), timer = useRef(null);

  useEffect(() => { setCanRead(typeof window !== "undefined" && "BarcodeDetector" in window); return stopCamera; }, []);

  function stopCamera() {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (stream.current) { stream.current.getTracks().forEach((t) => t.stop()); stream.current = null; }
  }

  async function send(text, method) {
    stopCamera(); setMode(null); setBusy(true); setErr(""); setRes(null);
    try {
      const r = await fetch("/api/driver/takings-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, method }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErr(j.error || "Try again.");
      else if (!j.ok) setErr(j.refused || "This shift report cannot be used.");
      else setRes(j);
    } catch { setErr("Check your connection and try again."); }
    finally { setBusy(false); }
  }

  // Clover payments not in yet are read again from Clover within a minute: ask again until they have been.
  useEffect(() => {
    if (!res || res.closed || !res.checking) return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      try {
        const r = await fetch(`/api/driver/takings-scan?scan=${res.scanId}`);
        const j = await r.json();
        if (r.ok && j.ok) setRes((old) => ({ ...old, ...j }));
        if ((j.closed || !j.checking) || n > 36) clearInterval(t);
      } catch { if (n > 36) clearInterval(t); }
    }, 5000);
    return () => clearInterval(t);
  }, [res?.scanId, res?.closed, res?.checking]);

  async function startCamera() {
    setErr(""); setRes(null); setMode("camera");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      stream.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play(); }
      const det = new window.BarcodeDetector({ formats: ["qr_code"] });
      timer.current = setInterval(async () => {
        try {
          const codes = video.current ? await det.detect(video.current) : [];
          if (codes && codes[0] && codes[0].rawValue) send(codes[0].rawValue, "camera");
        } catch {}
      }, 350);
    } catch {
      stopCamera(); setMode(null);
      setErr("The camera could not be opened. Allow the camera for this site, or choose a photo, or type the number.");
    }
  }

  async function fromPhoto(file) {
    if (!file) return;
    setErr(""); setRes(null);
    try {
      const det = new window.BarcodeDetector({ formats: ["qr_code"] });
      const img = await createImageBitmap(file);
      const codes = await det.detect(img);
      if (codes && codes[0] && codes[0].rawValue) send(codes[0].rawValue, "photo");
      else setErr("No QR code found in that photo. Take it closer and straight on, or type the number.");
    } catch { setErr("That photo could not be read. Type the number instead."); }
  }

  const s = res?.summary;
  const btn = "inline-flex items-center gap-2 rounded-xl border border-navy-900/10 bg-white px-4 py-3 text-sm font-semibold text-navy-900 hover:border-green-400 disabled:opacity-50";
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 sm:p-8">
        <div className="flex flex-wrap gap-3">
          <button type="button" className={btn} onClick={startCamera} disabled={busy || !canRead}><Camera className="w-4 h-4" /> Scan with camera</button>
          <label className={`${btn} cursor-pointer ${busy || !canRead ? "opacity-50 pointer-events-none" : ""}`}>
            <ImageUp className="w-4 h-4" /> Choose a photo
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { fromPhoto(e.target.files && e.target.files[0]); e.target.value = ""; }} />
          </label>
          <button type="button" className={btn} onClick={() => { stopCamera(); setMode("type"); setErr(""); }} disabled={busy}><Keyboard className="w-4 h-4" /> Type the number</button>
        </div>
        {!canRead && <p className="mt-3 text-sm text-navy-500">This browser cannot read QR codes. Type the report number instead (it is printed under the QR, like SR-000123).</p>}

        {mode === "camera" && (
          <div className="mt-5">
            <video ref={video} playsInline muted className="w-full max-w-sm rounded-xl bg-navy-900 aspect-square object-cover" />
            <div className="mt-2 flex items-center gap-3 text-sm text-navy-500"><Loader2 className="w-4 h-4 animate-spin" /> Point the camera at the QR on the report.
              <button type="button" className="text-navy-700 font-semibold" onClick={() => { stopCamera(); setMode(null); }}>Stop</button></div>
          </div>
        )}
        {mode === "type" && (
          <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); send(typed, "typed"); }}>
            <label className="text-xs text-navy-500">Report number<br />
              <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="SR-000123" maxLength={20}
                className="mt-1 w-44 font-mono font-semibold text-navy-900 border border-navy-900/10 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400" />
            </label>
            <button disabled={busy || !typed.trim()} className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-60">Check</button>
          </form>
        )}
        {busy && <p className="mt-4 flex items-center gap-2 text-sm text-navy-500"><Loader2 className="w-4 h-4 animate-spin" /> Checking every payment on the report…</p>}
        {err && /another driver/i.test(err) ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            <p className="font-bold">Not your report</p><p>This shift report belongs to another driver. The office has been told.</p>
          </div>
        ) : err && <p className="mt-4 flex items-start gap-2 text-sm text-red-700" role="alert"><XCircle className="w-4 h-4 mt-0.5 shrink-0" /> {err}</p>}
      </div>

      {res && s && (
        <div className="rounded-2xl bg-white border border-navy-900/5 card-shadow p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-bold text-navy-900 font-mono">{res.report?.number || "Shift report"}</h2>
            {res.report && <p className="text-sm text-navy-500">{time(res.report.from)} – {time(res.report.to)}</p>}
          </div>
          {res.checking > 0 && !res.closed && (
            <p className="mt-4 flex items-center gap-2 text-sm text-navy-600"><Loader2 className="w-4 h-4 animate-spin" /> Checking {res.checking} card payment{res.checking === 1 ? "" : "s"} - this takes up to a minute.</p>
          )}
          {res.closed && <GetPaid pay={res.pay} onAgain={() => { setRes(null); setErr(""); }} />}
          {(res.items || []).length > 0 && (
            <details className="mt-5 text-sm">
              <summary className="cursor-pointer text-navy-500">Payments on this report ({(res.items || []).length})</summary>
              <ul className="mt-2 divide-y divide-navy-900/5">
                {(res.items || []).map((x) => {
                  const [label, cls] = LABEL[x.state] || ["", ""];
                  return (
                    <li key={x.ref} className="py-2 flex items-center justify-between gap-3">
                      <span className="text-navy-700 tabular-nums">{x.at ? time(x.at) : <span className="font-mono text-xs">{x.ref}</span>}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

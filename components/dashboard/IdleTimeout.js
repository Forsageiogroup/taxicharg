"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

// Signs a driver out after this long with no mouse/keyboard/touch activity.
// Terminals are often left unattended between fares, so this keeps someone
// else from picking up an already-open session.
const IDLE_LIMIT_MS = 10 * 60 * 1000;
const WARNING_BEFORE_MS = 60 * 1000;
const CHECK_INTERVAL_MS = 5000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
// Shared across tabs in the same browser, so activity in one tab keeps the others alive too.
const STORAGE_KEY = "tc_driver_last_activity";

export default function IdleTimeout() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(null); // null = warning hidden
  const lastActivityRef = useRef(Date.now());
  const loggingOutRef = useRef(false);

  const recordActivity = useCallback(() => {
    if (loggingOutRef.current) return;
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // Private-browsing/storage-blocked: idle detection still works within this tab.
    }
    setSecondsLeft(null);
  }, []);

  useEffect(() => {
    function onStorage(e) {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const ts = Number(e.newValue);
      if (!Number.isNaN(ts) && ts > lastActivityRef.current) {
        lastActivityRef.current = ts;
        setSecondsLeft(null);
      }
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));
    window.addEventListener("storage", onStorage);
    recordActivity();

    const interval = setInterval(async () => {
      if (loggingOutRef.current) return;
      const remaining = IDLE_LIMIT_MS - (Date.now() - lastActivityRef.current);

      if (remaining <= 0) {
        loggingOutRef.current = true;
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          // Cookie may already be gone/expired — proceed to redirect regardless.
        }
        router.push("/login?reason=idle-timeout");
        router.refresh();
        return;
      }

      setSecondsLeft(remaining <= WARNING_BEFORE_MS ? Math.ceil(remaining / 1000) : null);
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, recordActivity));
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, [recordActivity, router]);

  if (secondsLeft === null) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-xl bg-white shadow-lg border border-navy-900/10 px-4 py-3.5">
      <div className="flex items-start gap-2.5">
        <Clock className="w-4.5 h-4.5 text-orange-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-navy-900">Still there?</p>
          <p className="mt-1 text-sm text-navy-500">
            For your security, you'll be signed out in {secondsLeft}s due to inactivity.
          </p>
        </div>
      </div>
      <button
        onClick={recordActivity}
        className="mt-3 w-full rounded-full brand-gradient text-white text-sm font-semibold py-2 hover:opacity-90 transition-opacity"
      >
        Stay signed in
      </button>
    </div>
  );
}

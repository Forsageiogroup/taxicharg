"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// The "one device at a time" rule (see lib/driverSession.js) is enforced
// server-side, but it only actually runs when the browser makes a fresh
// request — a page navigation or reload. A phone (or a tab put to sleep
// in the background) can sit on an already-rendered dashboard page for a
// long time without making any new request, so the moment it was
// switched out to another device can go unnoticed until the driver taps
// something. This component closes that gap: while a dashboard tab is
// open, it periodically asks the server "is this session still current?"
// and also checks immediately whenever the tab/page regains focus (e.g.
// switching back to it) — so a device that lost its session elsewhere
// gets signed out on its own, not just on next navigation.
const POLL_INTERVAL_MS = 45 * 1000;

export default function SessionWatcher() {
  const router = useRouter();
  const checkingRef = useRef(false);
  const loggedOutRef = useRef(false);

  useEffect(() => {
    async function check() {
      if (checkingRef.current || loggedOutRef.current) return;
      checkingRef.current = true;
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!data?.driver) {
          loggedOutRef.current = true;
          try {
            await fetch("/api/auth/logout", { method: "POST" });
          } catch {
            // Cookie may already be gone — proceed to redirect regardless.
          }
          router.push("/login?reason=session-replaced");
          router.refresh();
        }
      } catch {
        // A network blip shouldn't sign someone out — just try again next tick.
      } finally {
        checkingRef.current = false;
      }
    }

    function onVisibility() {
      if (document.visibilityState === "visible") check();
    }

    const interval = setInterval(check, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", check);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", check);
    };
  }, [router]);

  return null;
}

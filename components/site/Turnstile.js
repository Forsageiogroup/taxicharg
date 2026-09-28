"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile, the "I am human" check on the public forms (27 Sept).
 * Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set, and the
 * server then skips the check too (lib/protect.js) - set both keys or
 * neither. The site key is public by design; the secret never leaves the
 * server.
 *
 *   <Turnstile onToken={(t) => setToken(t)} />
 *
 * Add a hidden honeypot beside it with <Honeypot value onChange />: a field
 * people never see, which bots fill in.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!window.__tcTurnstile) {
    window.__tcTurnstile = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return window.__tcTurnstile;
}

export default function Turnstile({ onToken, className = "" }) {
  const box = useRef(null);
  const id = useRef(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let gone = false;
    loadScript()
      .then(() => {
        if (gone || !window.turnstile || !box.current) return;
        id.current = window.turnstile.render(box.current, {
          sitekey: SITE_KEY,
          theme: "light",
          callback: (t) => cb.current && cb.current(t),
          "expired-callback": () => cb.current && cb.current(""),
          "error-callback": () => cb.current && cb.current(""),
        });
      })
      .catch(() => {});
    return () => {
      gone = true;
      if (id.current && window.turnstile) { try { window.turnstile.remove(id.current); } catch {} }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={box} className={className} />;
}

/**
 * The field must look like nothing a browser recognises. It used to be
 * labelled "Company" with name="company" - Chrome took that for part of an
 * address form and filled it in from the person's saved address (28 Sept:
 * the owner could not log in; on the Join form it would have swallowed a
 * real application while saying "thanks"). Chrome ignores autocomplete="off"
 * on fields it thinks it knows, so the name and label are deliberately
 * meaningless. The posted key stays `company`, the API is unchanged.
 */
export function Honeypot({ value, onChange }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
      <label>
        Leave this blank
        <input type="text" name="tc_x7" id="tc_x7" tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore="true" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

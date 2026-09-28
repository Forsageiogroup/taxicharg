/**
 * Protection for the forms and the log in (27 Sept, tc-0011). Server only.
 *
 *   verifyTurnstile(token, ip)  Cloudflare's "I am human" check. Same keys
 *                               as the SYD CABS site (TURNSTILE_SECRET_KEY on
 *                               the server, NEXT_PUBLIC_TURNSTILE_SITE_KEY in
 *                               the page). Unconfigured or unreachable, it
 *                               lets the person through - a bot check must
 *                               never stop a real driver.
 *   honeypotTripped(body)       a field people never see, filled in by bots.
 *   rateHit(key, limit, secs)   one hit against a rolling counter in the
 *                               database (migration 129, tc_rate_hit). True
 *                               while within the limit. If the function is
 *                               not there yet it logs once and allows.
 *   clientIp(request)           the caller's address as Vercel reports it.
 *   tooMany(message)            the 429 reply.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export function clientIp(request) {
  const h = request.headers;
  return (h.get("x-real-ip") || h.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

export async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: "TURNSTILE_SECRET_KEY not set" };
  if (!token) return { ok: false, error: 'Please complete the "I am human" check and try again.' };
  try {
    const body = new URLSearchParams({ secret, response: String(token) });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const out = await res.json();
    if (out.success) return { ok: true };
    const codes = out["error-codes"] || [];
    if (codes.includes("timeout-or-duplicate")) {
      return { ok: false, error: "That check expired. Please tick it again and resubmit." };
    }
    console.warn("[turnstile] rejected:", codes.join(", "));
    return { ok: false, error: "We could not verify that you are human. Please try again." };
  } catch (err) {
    console.error("[turnstile] unreachable, allowing through:", err.message);
    return { ok: true, degraded: err.message };
  }
}

export function honeypotTripped(body) {
  const tripped = Boolean(body && typeof body.company === "string" && body.company.trim());
  if (tripped) console.warn("[protect] honeypot filled:", JSON.stringify(body.company).slice(0, 60)); // so it is visible in the logs, never silent
  return tripped;
}

let rateWarned = false;
export async function rateHit(key, limit, windowSeconds) {
  try {
    const { data, error } = await db().rpc("tc_rate_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) throw error;
    if (Math.random() < 0.01) db().rpc("tc_rate_sweep").then(() => {}, () => {});
    return data !== false;
  } catch (err) {
    if (!rateWarned) { rateWarned = true; console.error("[rate limit] not counting (run migration 129?):", err.message || err); }
    return true;
  }
}

export function tooMany(message) {
  return NextResponse.json({ error: message }, { status: 429, headers: { "Retry-After": "900" } });
}

/** The common gate for a public form: honeypot, human check, per-address limit. */
export async function gateForm(request, body, { form, limit = 10, windowSeconds = 900 }) {
  if (honeypotTripped(body)) return NextResponse.json({ ok: true }); // tell the bot nothing
  const ip = clientIp(request);
  if (!(await rateHit(`${form}:ip:${ip}`, limit, windowSeconds))) {
    return tooMany("Too many attempts from this connection. Please wait 15 minutes and try again.");
  }
  const human = await verifyTurnstile(body?.turnstileToken, ip);
  if (!human.ok) return NextResponse.json({ error: human.error }, { status: 400 });
  return null;
}

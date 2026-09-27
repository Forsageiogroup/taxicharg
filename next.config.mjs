/**
 * Security headers on every response (27 Sept, tc-0011). The same set as
 * the SYD CABS site's vercel.json, cut to what this site actually loads:
 *
 *   Content-Security-Policy   which scripts, styles, fonts and frames the
 *                             browser may run - our own, Google Fonts for
 *                             the wordmark, and Cloudflare's "I am human"
 *                             check. Nothing else, so a script injected by
 *                             some other route has nowhere to load from
 *                             (the form-jacking the checklist warns of).
 *   Strict-Transport-Security browsers keep to HTTPS for two years, and the
 *                             domain can go on the preload list.
 *   X-Frame-Options / frame-ancestors   nobody can put this site in a frame.
 *   nosniff, Referrer-Policy, Permissions-Policy, COOP   the usual.
 *
 * If something breaks after a deploy, the browser console names the CSP
 * line - widen only that directive.
 */
const dev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://challenges.cloudflare.com https://*.supabase.co",
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // the dashboard and the API are personal: never cached, never indexed
      { source: "/dashboard/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;

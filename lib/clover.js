/**
 * Clover OAuth v2 ("high-trust app") helper.
 *
 * Env vars (set in Vercel → Project Settings → Environment Variables,
 * and in .env.local for development — see .env.example):
 *   CLOVER_APP_ID        — from your Clover app in the developer dashboard
 *   CLOVER_APP_SECRET
 *   CLOVER_ENV            — "sandbox" (default) or "production"
 *   NEXT_PUBLIC_APP_URL   — used to build the OAuth redirect_uri
 *
 * Docs: https://docs.clover.com/dev/docs/use-oauth
 *       https://docs.clover.com/dev/docs/generate-expiring-tokens-using-v2-oauth-flow
 */

const HOSTS = {
  sandbox: { authorize: "https://sandbox.dev.clover.com", token: "https://apisandbox.dev.clover.com" },
  production: { authorize: "https://www.clover.com", token: "https://api.clover.com" },
};

function hosts() {
  const env = process.env.CLOVER_ENV === "production" ? "production" : "sandbox";
  return HOSTS[env];
}

export function isCloverConfigured() {
  return Boolean(process.env.CLOVER_APP_ID && process.env.CLOVER_APP_SECRET);
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function redirectUri() {
  return `${appUrl()}/api/clover/callback`;
}

/**
 * Builds the URL to send a driver to in order to authorise TaxiCharg
 * against their Clover merchant account. `state` should be a short-lived
 * signed token (see /api/clover/connect) so the callback can be verified.
 */
export function getAuthorizeUrl(state) {
  const url = new URL("/oauth/v2/authorize", hosts().authorize);
  url.searchParams.set("client_id", process.env.CLOVER_APP_ID);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Exchanges an authorization `code` (from the OAuth callback) for an
 * access token, per Clover's "high-trust app" v2 flow.
 */
export async function exchangeCodeForToken(code) {
  const res = await fetch(`${hosts().token}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.CLOVER_APP_ID,
      client_secret: process.env.CLOVER_APP_SECRET,
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Clover token exchange failed (${res.status}): ${text}`);
  }

  return res.json(); // { access_token, access_token_expiration, refresh_token, refresh_token_expiration }
}

/**
 * Simple authenticated GET against the Clover REST API for a merchant,
 * useful for a first smoke-test once a driver connects (e.g. pulling
 * merchant details to confirm the token works).
 */
export async function cloverGet(merchantId, path, accessToken) {
  const base = hosts().token.replace("apisandbox.dev.clover.com", "apisandbox.dev.clover.com");
  const res = await fetch(`${base}/v3/merchants/${merchantId}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Clover API request failed (${res.status})`);
  return res.json();
}

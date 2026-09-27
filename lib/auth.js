import { SignJWT, jwtVerify } from "jose";

/**
 * Cookie sessions as signed JWTs. The password itself is checked by
 * Supabase Auth (lib/data/drivers.js); once it passes, this cookie is what
 * keeps the person logged in on this site.
 */

const encoder = new TextEncoder();

function getSecret() {
  // AUTH_SECRET signs every session. In production, if it has not been set,
  // the service key stands in (it is secret and always present) rather than
  // a value anyone can read in this file. Set AUTH_SECRET all the same:
  //   openssl rand -base64 48
  const secret = process.env.AUTH_SECRET
    || (process.env.NODE_ENV === "production" ? process.env.SUPABASE_SERVICE_ROLE_KEY : "")
    || "dev-only-insecure-secret-change-me";
  return encoder.encode(secret);
}

export const DRIVER_COOKIE = "tc_driver_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export async function createSessionToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

/**
 * Short-lived signed state tokens for OAuth redirects (Clover, Stripe).
 * Prevents CSRF on the callback by proving the callback belongs to the
 * driver who initiated the connect flow.
 */
export async function signState(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecret());
}

export async function verifyState(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}

/**
 * The second step of a log in (27 Sept): a ticket that says "this person's
 * password was right, a code is on its way", and the trusted-device cookie
 * that says "this device passed the code before, do not ask for 30 days".
 */
export const TRUSTED_COOKIE = "tc_trusted_device";
const TRUSTED_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function signCodeTicket(driverId) {
  return new SignJWT({ sub: driverId, kind: "code" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getSecret());
}
export async function verifyCodeTicket(token) {
  const p = await verifyState(token);
  return p && p.kind === "code" ? p : null;
}

export async function signTrustedDevice(driverId) {
  return new SignJWT({ sub: driverId, kind: "trusted" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TRUSTED_TTL_SECONDS}s`)
    .sign(getSecret());
}
export async function isTrustedDevice(token, driverId) {
  const p = await verifyState(token);
  return Boolean(p && p.kind === "trusted" && p.sub === driverId);
}
export const trustedCookieOptions = { ...sessionCookieOptions, maxAge: TRUSTED_TTL_SECONDS, path: "/api/auth" };

/** A code is hashed with the site secret before it is stored, so the table alone is useless. */
export async function hashCode(driverId, code) {
  const data = encoder.encode(`${driverId}:${code}`);
  const key = await crypto.subtle.importKey("raw", getSecret(), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return Buffer.from(sig).toString("base64url");
}

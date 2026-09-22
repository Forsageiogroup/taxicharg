import { SignJWT, jwtVerify } from "jose";

/**
 * Cookie sessions as signed JWTs. The password itself is checked by
 * Supabase Auth (lib/data/drivers.js); once it passes, this cookie is what
 * keeps the person logged in on this site.
 */

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me";
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

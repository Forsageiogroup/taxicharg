import { SignJWT, jwtVerify } from "jose";

/**
 * Lightweight cookie-session auth using signed JWTs (no external auth
 * provider or database required). Swap this out for NextAuth / your own
 * provider later if you need OAuth, magic links, etc. — the rest of the
 * app only talks to `getDriverSession` / `getAdminSession`, so that's the
 * one file to change.
 */

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.AUTH_SECRET || "dev-only-insecure-secret-change-me";
  return encoder.encode(secret);
}

export const DRIVER_COOKIE = "tc_driver_session";
export const ADMIN_COOKIE = "tc_admin_session";

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

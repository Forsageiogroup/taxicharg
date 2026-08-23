import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";

/**
 * Resolves (and enforces) the current request's driver session. Returns
 * null if there's no valid cookie, the driver no longer exists, OR — the
 * "one device at a time" rule — a newer login elsewhere replaced this
 * session's ID. Every driver-facing API route that needs to know who's
 * calling should use this instead of calling verifySessionToken
 * directly, so a signed-out device can't keep taking actions (starting a
 * withdrawal, connecting/disconnecting a payment provider, editing a
 * profile) just because its cookie hasn't expired yet.
 */
export async function requireDriverSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(DRIVER_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session || session.role !== "driver") return null;

  const driver = await findDriverById(session.sub);
  if (!driver) return null;
  if (session.sid !== driver.sessionId) return null;

  return { session, driver };
}

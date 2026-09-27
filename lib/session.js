import { cookies } from "next/headers";
import { setDriverSessionId } from "@/lib/data/drivers";
import { createSessionToken, sessionCookieOptions, DRIVER_COOKIE } from "@/lib/auth";

/**
 * Sign a driver in on this site: one active login at a time. A fresh
 * session ID is claimed for this sign-in and embedded in the cookie; any
 * device signed in with an older ID is signed out next time it loads a page.
 */
export async function issueDriverSession(driver) {
  const sessionId = crypto.randomUUID();
  await setDriverSessionId(driver.id, sessionId);
  const token = await createSessionToken({ sub: driver.id, email: driver.email, role: "driver", sid: sessionId });
  const cookieStore = await cookies();
  cookieStore.set(DRIVER_COOKIE, token, sessionCookieOptions);
  return { ok: true, driver: { id: driver.id, name: driver.name, email: driver.email } };
}

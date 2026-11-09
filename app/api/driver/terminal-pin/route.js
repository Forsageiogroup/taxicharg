import { NextResponse } from "next/server";
import { driverFromRequest } from "@/lib/driverAuth";
import { rateHit, tooMany } from "@/lib/protect";
import { setPin } from "@/lib/data/terminalMenu";
import { isPin } from "@/lib/terminal/menu";

/**
 * tc-0019: the driver sets or changes the 4-digit PIN for the menu on his terminal (FareTap on the Clover, the
 * S710). Not his cab-tablet PIN, which the office gives. Only the hash is kept (362). Body: { pin, pin2 }.
 */
export async function POST(request) {
  const driver = await driverFromRequest(request);
  if (!driver) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (driver.status !== "active") return NextResponse.json({ error: "Your account is not active. Contact TaxiCharg support." }, { status: 403 });
  if (!(await rateHit(`tc-tpin:${driver.id}`, 10, 3600))) return tooMany("Too many changes in an hour. Try again later.");
  let body = {};
  try { body = await request.json(); } catch {}
  const pin = String(body.pin ?? "");
  if (!isPin(pin)) return NextResponse.json({ error: "The PIN is 4 digits." }, { status: 400 });
  if (body.pin2 !== undefined && String(body.pin2) !== pin) return NextResponse.json({ error: "The two PINs are not the same." }, { status: 400 });
  try {
    await setPin(driver.id, pin, "taxicharg");
  } catch (e) {
    return NextResponse.json({ error: e.message || "Not saved." }, { status: e.status || 500 });
  }
  return NextResponse.json({ ok: true });
}

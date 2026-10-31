import { NextResponse } from "next/server";
import { driverFromRequest } from "@/lib/driverAuth";
import { cardMoney } from "@/lib/terminal/cardMoney";
import { cardTotals } from "@/lib/money/cardReport";

/**
 * tc-0016: an S710 driver's card money - his card fares, his balance and his
 * cash outs. For the TaxiCharg phone app (Bearer: his sign-in) and the website
 * (its login cookie). Only ever HIS: the driver comes from the login.
 */
export async function GET(request) {
  const driver = await driverFromRequest(request);
  if (!driver) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (driver.status !== "active") return NextResponse.json({ error: "Your account is not active. Contact TaxiCharg support." }, { status: 403 });
  try {
    const m = await cardMoney(driver, { limit: 200 });
    return NextResponse.json({ ...m, totals: cardTotals(m.rows) });
  } catch (err) {
    console.error("[api/driver/card]", err.message || err);
    return NextResponse.json({ error: "Your card payments could not be read. Try again." }, { status: 500 });
  }
}

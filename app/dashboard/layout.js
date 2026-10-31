import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { driverForRequest as findDriverById } from "@/lib/data/request";   // tc-0014: read once per page view
import DashboardShell from "@/components/dashboard/DashboardShell";
import { summaryForRequest as getDriverSummary } from "@/lib/data/request";
import { getPayoutAccount } from "@/lib/data/stripeAccounts";
import { hasCardSide } from "@/lib/terminal/cardMoney";

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(DRIVER_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  const driver = await findDriverById(session.sub);
  if (!driver) redirect("/login");

  // One active login at a time: if this token's session ID doesn't match
  // the one currently on the driver's record, a newer login happened on
  // another device/terminal — sign this one out.
  if (session.sid !== driver.sessionId) redirect("/api/auth/session-replaced");

  const { password, ...safeDriver } = driver;

  // tc-0013: the header shows his Clover balance only while a Clover terminal is his
  const cloverAvailable = driver.view && driver.view.clover ? (await getDriverSummary(driver.id)).availableBalance : null;

  // tc-0016: the card menu - an S710 is his, or he has a payout account (money may still be in it)
  let cardSide = Boolean(driver.view && driver.view.stripe);
  if (!cardSide) { try { cardSide = hasCardSide(driver, await getPayoutAccount(driver.id)); } catch { cardSide = false; } }

  return <DashboardShell driver={safeDriver} cloverAvailable={cloverAvailable} cardSide={cardSide}>{children}</DashboardShell>;
}

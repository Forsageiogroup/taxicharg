import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getDriverSummary } from "@/lib/data/payments";

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

  return <DashboardShell driver={safeDriver} cloverAvailable={cloverAvailable}>{children}</DashboardShell>;
}

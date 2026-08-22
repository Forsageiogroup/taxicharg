import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { findDriverById } from "@/lib/data/drivers";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(DRIVER_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) redirect("/login");

  const driver = await findDriverById(session.sub);
  if (!driver) redirect("/login");

  const { password, ...safeDriver } = driver;

  return <DashboardShell driver={safeDriver}>{children}</DashboardShell>;
}

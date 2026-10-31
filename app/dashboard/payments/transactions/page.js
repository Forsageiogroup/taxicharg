import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { listPaymentsForDriver } from "@/lib/data/payments";
import PageHeader from "@/components/dashboard/PageHeader";
import PaymentsTable from "@/components/dashboard/PaymentsTable";
import CloverOnly from "@/components/dashboard/CloverOnly";
import { driverForRequest as findDriverById } from "@/lib/data/request";   // tc-0014: read once per page view

export default async function TransactionsPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const driver = await findDriverById(session.sub);
  if (!driver?.view?.clover) return <CloverOnly title="Transactions" />;   // tc-0013
  const payments = await listPaymentsForDriver(session.sub, { limit: 200 });

  return (
    <div>
      <PageHeader title="Transactions" subtitle="Every Clover terminal fare, with its service fee, commission and any void or refund." />
      <PaymentsTable payments={payments} />
    </div>
  );
}

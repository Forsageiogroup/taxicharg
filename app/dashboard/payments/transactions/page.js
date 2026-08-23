import { cookies } from "next/headers";
import { verifySessionToken, DRIVER_COOKIE } from "@/lib/auth";
import { listPaymentsForDriver } from "@/lib/data/payments";
import PageHeader from "@/components/dashboard/PageHeader";
import PaymentsTable from "@/components/dashboard/PaymentsTable";

export default async function TransactionsPage() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(DRIVER_COOKIE)?.value);
  const payments = await listPaymentsForDriver(session.sub, { limit: 200 });

  return (
    <div>
      <PageHeader title="Transactions" subtitle="Every fare, tip and fee — searchable and exportable." />
      <PaymentsTable payments={payments} />
    </div>
  );
}

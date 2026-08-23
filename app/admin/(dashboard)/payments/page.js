import { listAllPayments } from "@/lib/data/payments";
import { listDrivers } from "@/lib/data/drivers";
import PageHeader from "@/components/dashboard/PageHeader";
import AdminPaymentsTable from "@/components/admin/AdminPaymentsTable";

export default async function AdminPaymentsPage() {
  const [payments, drivers] = await Promise.all([
    listAllPayments({ limit: 500 }),
    listDrivers(),
  ]);

  return (
    <div>
      <PageHeader title="Payments" subtitle="Every fare, tip and fee across the fleet — searchable and exportable." />
      <AdminPaymentsTable payments={payments} drivers={drivers} />
    </div>
  );
}

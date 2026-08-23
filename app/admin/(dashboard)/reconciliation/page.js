import { getFleetReconciliation } from "@/lib/data/reports";
import PageHeader from "@/components/dashboard/PageHeader";
import ReconciliationTable from "@/components/admin/ReconciliationTable";

export default async function AdminReconciliationPage() {
  const rows = await getFleetReconciliation({ days: 14 });

  return (
    <div>
      <PageHeader title="Reconciliation" subtitle="Lay this beside your payment provider's dashboard — every day should match to the cent." />
      <ReconciliationTable rows={rows} />
    </div>
  );
}

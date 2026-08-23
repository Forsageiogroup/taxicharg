import { getPaymentIssuesSummary } from "@/lib/data/payments";
import PageHeader from "@/components/dashboard/PageHeader";
import PaymentIssuesTabs from "@/components/admin/PaymentIssuesTabs";

export default async function PaymentIssuesPage() {
  const { failed, voided, duplicates, cardAlerts } = await getPaymentIssuesSummary();

  return (
    <div>
      <PageHeader
        title="Payment issues"
        subtitle="Failed and voided transactions, possible duplicate charges, and repeat-card security alerts."
      />
      <PaymentIssuesTabs failed={failed} voided={voided} duplicates={duplicates} cardAlerts={cardAlerts} />
    </div>
  );
}

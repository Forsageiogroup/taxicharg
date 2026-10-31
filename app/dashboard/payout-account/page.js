import PageHeader from "@/components/dashboard/PageHeader";
import PayoutAccount from "@/components/dashboard/PayoutAccount";

/**
 * The driver's own TaxiCharg payout account (tc-0012, 31 Oct 2026).
 * Everything on it is loaded by the PayoutAccount component from
 * /api/stripe/account, which checks the login on every call.
 */
export default function PayoutAccountPage() {
  return (
    <div>
      <PageHeader
        title="Payout account"
        subtitle="Where your TaxiCharg terminal fares are paid, and where you withdraw to your bank."
      />
      <PayoutAccount publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""} />
    </div>
  );
}

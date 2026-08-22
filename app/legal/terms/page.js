import LegalPage from "@/components/site/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="August 2026">
      <p>
        These terms govern your use of TaxiCharg&apos;s driver payment platform, including the
        website, driver dashboard, EFTPOS terminal and driver card.
      </p>
      <p>
        By creating a TaxiCharg account you agree to provide accurate information, use the
        service only for lawful taxi operations in NSW, and comply with any card network and
        payment processor terms that apply to your account (including Stripe and Clover).
      </p>
      <p>
        TaxiCharg may suspend or close an account that breaches these terms, is used
        fraudulently, or where required by a payment processor or regulator.
      </p>
      <p>
        We may update these terms from time to time; continued use of TaxiCharg after an update
        means you accept the revised terms.
      </p>
    </LegalPage>
  );
}

import LegalPage from "@/components/site/LegalPage";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 2026">
      <p>
        TaxiCharg (&quot;we&quot;, &quot;us&quot;) collects personal information you provide when
        you sign up as a driver, including your name, contact details, vehicle and licence
        details, and payment information.
      </p>
      <p>
        We use this information to operate your account, process payments, provide support, and
        meet our obligations under Australian law, including the Privacy Act 1988 (Cth).
      </p>
      <p>
        We do not sell your personal information. We share it only with service providers who
        help us run TaxiCharg (such as our payment processors) and where required by law.
      </p>
      <p>
        You can request access to, or correction of, your personal information at any time by
        contacting support@taxicharg.com.au.
      </p>
    </LegalPage>
  );
}

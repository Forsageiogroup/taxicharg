import LegalPage from "@/components/site/LegalPage";

// Who we are, in one place. Fill these in once; the policy reads them.
const ENTITY = "TaxiCharg";                       // e.g. "W Eats Pty Ltd, trading as TaxiCharg"
const ABN = "";                                    // e.g. "12 345 678 901"
const ADDRESS = "our Sydney office";               // the postal address for written complaints
const EMAIL = "support@taxicharg.com.au";
const SITE = "taxicharg.com.au";
const UPDATED = "22 September 2026";

export const metadata = {
  title: "Privacy Policy | TaxiCharg",
  description: "How TaxiCharg collects, uses, shares, stores and protects your personal information, under the Australian Privacy Principles.",
};

export default function PrivacyPolicyPage() {
  const who = ENTITY + (ABN ? ` (ABN ${ABN})` : "");
  return (
    <LegalPage title="Privacy Policy" updated={UPDATED} draft={false}>
      <p>
        Thank you for trusting us with your information. Being clear about how we collect, use,
        share, store and protect it is part of how we earn that trust. This policy explains what
        we do with personal information, and what you can ask of us.
      </p>

      <h2>1. Who we are and what this policy covers</h2>
      <p>
        {who} (&ldquo;TaxiCharg&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) provides EFTPOS terminals,
        payment settlement and related services to taxi drivers and operators, and runs the
        website at {SITE} and the TaxiCharg driver dashboard. We are bound by the <em>Privacy Act 1988</em> (Cth)
        and the Australian Privacy Principles (APPs) in it, and where we handle payment card
        data we follow the Payment Card Industry Data Security Standard (PCI DSS).
      </p>
      <p>
        &ldquo;Personal information&rdquo; means information or an opinion about an identified
        individual, or an individual who is reasonably identifiable, whether or not it is true
        and whether or not it is recorded in a material form. This policy applies to personal
        information about drivers, operators, applicants, website visitors and anyone else we
        deal with. It does not cover the passengers who pay a fare on a TaxiCharg terminal
        except as set out in section 4.
      </p>

      <h2>2. The personal information we collect</h2>
      <p>The kinds of personal information we collect depend on how you deal with us. They may include:</p>
      <ul>
        <li><strong>Identity and contact details</strong> &mdash; your name, date of birth, phone number, email address and postal address.</li>
        <li><strong>Driving and business details</strong> &mdash; your NSW driver authority and driver licence details, your ABN, the network or fleet you drive for, and the vehicle and plate a terminal is fitted to.</li>
        <li><strong>Identity verification</strong> &mdash; copies or details of identity documents we or our payment partners need to verify who you are, as the law requires before money can be paid to you.</li>
        <li><strong>Financial details</strong> &mdash; your bank account details for payouts, your TaxiCharg balance, withdrawals and settlement history, and information about any prepaid or debit card issued to you through TaxiCharg.</li>
        <li><strong>Terminal and transaction records</strong> &mdash; the terminal allocated to you and each fare taken on it: amount, date and time, payment method and settlement status. Card numbers are handled by the terminal and our payment processor and are not stored in full by us.</li>
        <li><strong>Account and support records</strong> &mdash; your login details (passwords are stored only in encrypted form), the device you sign in from, and what you tell us when you contact support or make a complaint.</li>
        <li><strong>Website use</strong> &mdash; the technical information described in section 11.</li>
      </ul>
      <p>
        We only collect sensitive information (for example a criminal history check, where a
        network requires one before a terminal is issued) with your consent, and only where it is
        reasonably necessary for the service. You may deal with us anonymously or under a
        pseudonym for general enquiries, but not for an account, a terminal or a payout, because
        the law requires us to know who we are paying.
      </p>

      <h2>3. How we collect it</h2>
      <p>
        We collect personal information directly from you where we can: when you apply online,
        sign up, use the driver dashboard, take fares on a terminal, contact us, or deal with us
        in person at our office. We also receive personal information from third parties,
        including our payment processors and card issuers (transaction and verification
        results), the taxi network or operator you drive for (to confirm you hold a terminal
        with them), and publicly available registers where the law lets us check a driver
        authority or ABN. If we receive personal information we did not ask for and could not
        have collected ourselves, we will destroy or de-identify it where it is lawful and
        reasonable to do so.
      </p>

      <h2>4. Passengers</h2>
      <p>
        When a passenger pays a fare on a TaxiCharg terminal, the terminal and our payment
        processor handle the card transaction. We receive the amount, time, terminal and a
        masked card reference so the fare can be settled to the driver and so a receipt can be
        found later. We do not receive the passenger&rsquo;s name or full card number, and we
        do not use transaction data to identify or contact passengers, except to respond to a
        receipt request, a dispute or a lawful request from a regulator or law enforcement.
      </p>

      <h2>5. Why we collect, hold and use personal information</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>assess your application, set up your account and allocate a terminal to you;</li>
        <li>process fares, settle them to your balance and pay you out the way you choose;</li>
        <li>verify your identity and bank details, and prevent fraud, money laundering and misuse of terminals;</li>
        <li>operate the driver dashboard, show you your transactions, statements and balance, and provide support;</li>
        <li>issue and manage any TaxiCharg card, where you apply for one;</li>
        <li>meet our legal obligations, including tax, financial-services, anti-money-laundering and point-to-point transport requirements, and respond to regulators and courts;</li>
        <li>tell you about changes to our services, fees or this policy; and</li>
        <li>improve our services and, with your consent or where the law allows, tell you about other TaxiCharg products or offers.</li>
      </ul>
      <p>
        We may contact you by phone, SMS, email, post or through the dashboard. You can opt out
        of marketing messages at any time by using the unsubscribe link in the message or by
        emailing us; we will still send you the service and account messages you need.
      </p>

      <h2>6. Who we share it with</h2>
      <p>We share personal information only where it is needed to provide our services or the law requires it. That means:</p>
      <ul>
        <li><strong>Payment processors, acquirers and card schemes</strong> that process fares taken on your terminal and pay funds to you;</li>
        <li><strong>Card issuers and program managers</strong>, if you apply for a TaxiCharg card, so the card can be issued and loaded;</li>
        <li><strong>Banks</strong>, to make payouts to the account you nominate;</li>
        <li><strong>Identity verification and fraud-prevention providers</strong>, to confirm who you are;</li>
        <li><strong>The taxi network, fleet or operator you drive for</strong>, to confirm terminal allocations and, where you authorise it, to settle amounts between you;</li>
        <li><strong>Our service providers</strong> &mdash; hosting, database, email, SMS, accounting and support systems &mdash; who may only use the information to provide their service to us;</li>
        <li><strong>Our professional advisers, insurers and auditors</strong>, under duties of confidentiality;</li>
        <li><strong>Regulators, courts and law enforcement</strong> where a law, court order, subpoena or warrant requires it, or where it is reasonably necessary to protect our rights, property or safety or those of others; and</li>
        <li><strong>A purchaser or successor</strong> of our business, under an agreement to keep the information confidential, if we sell or restructure the business.</li>
      </ul>
      <p>We do not sell personal information, and we do not give it to anyone for their own marketing.</p>

      <h2>7. Overseas disclosure</h2>
      <p>
        Our records are stored in Australia. Some of the providers we use &mdash; for example
        our payment processor, hosting or email services &mdash; may store or process
        information on servers outside Australia, including in the United States and the
        European Union. Before we disclose personal information overseas we take reasonable
        steps to make sure the recipient handles it in a way that is consistent with the
        Australian Privacy Principles, including through our contracts with them.
      </p>

      <h2>8. How we keep it secure</h2>
      <p>
        We take reasonable steps to protect personal information from misuse, interference,
        loss, and unauthorised access, modification or disclosure. Our systems use encrypted
        connections, access controls so staff see only what their role needs, logging of
        changes to records, and encrypted storage of passwords and documents. Card data is
        handled by PCI-compliant terminals and processors. Our staff are trained in handling
        personal information, and access to our office and records is restricted.
      </p>
      <p>
        No transmission over the internet is completely secure, and you send information to us
        at your own risk. Please keep your login details private, and tell us straight away if
        you think your account has been accessed without your permission. If a data breach
        occurs that is likely to result in serious harm to you, we will notify you and the
        Office of the Australian Information Commissioner as the <em>Privacy Act</em> requires.
      </p>

      <h2>9. How long we keep it</h2>
      <p>
        We keep personal information for as long as we need it for the purposes above and to
        meet our legal obligations. Financial and transaction records are kept for at least
        seven years, as tax and financial-services laws require. When information is no longer
        needed we take reasonable steps to destroy it or de-identify it.
      </p>

      <h2>10. Access to and correction of your information</h2>
      <p>
        You can ask for a copy of the personal information we hold about you, and ask us to
        correct anything that is inaccurate, out of date, incomplete, irrelevant or misleading.
        Much of it is available to you at any time in the driver dashboard. For anything else,
        email us at <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. We will respond within 30 days.
        There is no charge for making a request; if a request is complex we may charge a
        reasonable fee for the time taken to compile it, and we will tell you before we do. In
        the limited circumstances where the <em>Privacy Act</em> lets us refuse access or a
        correction, we will tell you why in writing and how you can complain.
      </p>

      <h2>11. Our website and cookies</h2>
      <p>
        When you visit {SITE} we may collect the technical information a browser sends &mdash;
        your IP address, browser and device type, the pages you view and the site you came
        from. We use it in aggregate to understand how the site is used and to keep it secure.
      </p>
      <p>
        We use cookies and similar technologies to keep you signed in to the dashboard, to
        remember your preferences and to measure site traffic. You can block or delete cookies
        in your browser settings, but the dashboard will not work without the sign-in cookie.
        We do not use cookies to serve third-party advertising on other websites.
      </p>
      <p>
        Our site may link to websites we do not control, including our payment partners. Those
        links are for your convenience and are not an endorsement, and we are not responsible
        for the privacy practices of other sites. Please read their privacy policies.
      </p>

      <h2>12. Location information</h2>
      <p>
        The TaxiCharg website and driver dashboard do not collect your device&rsquo;s location.
        Your IP address may indicate a general area (city and country), which we use only for
        security and troubleshooting. If a TaxiCharg app or terminal feature that uses location
        is introduced, it will ask for your permission first and this policy will be updated.
      </p>

      <h2>13. Complaints</h2>
      <p>
        If you think we have mishandled your personal information or breached the Australian
        Privacy Principles, please tell us. Email <a href={`mailto:${EMAIL}`}>{EMAIL}</a> or
        write to {ADDRESS}, with as much detail as you can. We will acknowledge your complaint
        promptly, investigate it and reply to you in writing, normally within 30 days. If you
        are not satisfied with our response, you can complain to the Office of the Australian
        Information Commissioner at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a> or
        on 1300 363 992.
      </p>

      <h2>14. Changes to this policy</h2>
      <p>
        We may update this policy from time to time, for example when our services or the law
        change. The current version is always at {SITE}/legal/privacy, with the date it was
        last updated at the top. Where a change is significant we will tell you through the
        dashboard or by email. Continuing to use our services after a change means you accept
        the updated policy.
      </p>

      <h2>15. Contact us</h2>
      <p>
        Questions about this policy or your personal information: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>
    </LegalPage>
  );
}

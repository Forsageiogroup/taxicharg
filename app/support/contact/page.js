import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SubpageHero from "@/components/site/SubpageHero";
import ContactCTA from "@/components/site/sections/ContactCTA";
import SubNav from "@/components/site/SubNav";

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <SubNav title="Contact" cta={{ href: "/signup", label: "Sign up" }} />
      <main className="flex-1">
        <SubpageHero
          seed={29}
          eyebrow="Contact"
          title="Talk to the TaxiCharg team"
          subtitle="Questions about signing up, your account, a payment or a fare? Write to us, or come and see us in Greenacre."
        />
        <ContactCTA />
      </main>
      <Footer />
    </>
  );
}

import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SubpageHero from "@/components/site/SubpageHero";
import ContactCTA from "@/components/site/sections/ContactCTA";

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <SubpageHero
          eyebrow="Contact"
          title="Talk to the TaxiCharg team"
          subtitle="Questions about signing up, your account, or a payment? We're here to help."
        />
        <ContactCTA />
      </main>
      <Footer />
    </>
  );
}

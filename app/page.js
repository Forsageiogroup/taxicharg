import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Hero from "@/components/site/sections/Hero";
import ValueProps from "@/components/site/sections/ValueProps";
import DriversFirst from "@/components/site/sections/DriversFirst";
import SupportSection from "@/components/site/sections/SupportSection";
import DriverCardPromo from "@/components/site/sections/DriverCardPromo";
import WalletBadges from "@/components/site/sections/WalletBadges";
import ContactCTA from "@/components/site/sections/ContactCTA";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ValueProps />
        <DriversFirst />
        <SupportSection />
        <DriverCardPromo />
        <WalletBadges />
        <ContactCTA />
      </main>
      <Footer />
    </>
  );
}

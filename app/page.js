import Navbar from "@/components/site/Navbar";
import SubNav from "@/components/site/SubNav";
import Footer from "@/components/site/Footer";
import Hero from "@/components/site/sections/Hero";
import WhyChoose from "@/components/site/sections/WhyChoose";
import Facts from "@/components/site/sections/Facts";
import Features from "@/components/site/sections/Features";
import Partnership from "@/components/site/sections/Partnership";
import HowItWorks from "@/components/site/sections/HowItWorks";
import Testimonials from "@/components/site/sections/Testimonials";
import CtaBand from "@/components/site/sections/CtaBand";

const sections = [
  { href: "#why", label: "Why TaxiCharg" },
  { href: "#features", label: "Instant pay" },
  { href: "#referrals", label: "Referrals" },
  { href: "#how", label: "How it works" },
];

export default function Home() {
  return (
    <>
      <Navbar />
      <SubNav items={sections} />
      <main className="flex-1">
        <Hero />
        <WhyChoose />
        <Facts />
        <Features />
        <Partnership />
        <HowItWorks />
        <Testimonials />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}

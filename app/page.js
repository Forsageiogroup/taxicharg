import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Hero from "@/components/site/sections/Hero";
import WhyChoose from "@/components/site/sections/WhyChoose";
import Features from "@/components/site/sections/Features";
import Partnership from "@/components/site/sections/Partnership";
import HowItWorks from "@/components/site/sections/HowItWorks";
import CtaBand from "@/components/site/sections/CtaBand";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <WhyChoose />
        <Features />
        <Partnership />
        <HowItWorks />
        <CtaBand />
      </main>
      <Footer />
    </>
  );
}

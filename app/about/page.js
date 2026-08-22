import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SubpageHero from "@/components/site/SubpageHero";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <SubpageHero
          eyebrow="About TaxiCharg"
          title="Built by people who understand the taxi trade"
          subtitle="TaxiCharg is a driver payment solution for NSW taxi drivers, focused on fast settlement, fair pricing and support that actually helps."
        />
        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-6 text-navy-700 leading-relaxed">
            <p>
              We started TaxiCharg because too many drivers were losing time and money to
              payment systems that weren&apos;t built for them &mdash; slow settlement, unclear
              fees, and support lines that went nowhere.
            </p>
            <p>
              Today, TaxiCharg gives NSW taxi drivers a straightforward EFTPOS terminal, a
              driver card that pays out as fares are earned, and a dashboard that shows exactly
              where every dollar is &mdash; all backed by a support team who know the industry.
            </p>
            <p>
              We&apos;re just getting started, and every feature on this platform is shaped by
              feedback from real drivers on the road.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

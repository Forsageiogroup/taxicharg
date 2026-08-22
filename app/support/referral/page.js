import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SubpageHero from "@/components/site/SubpageHero";
import { Gift, Users, DollarSign } from "lucide-react";
import Link from "next/link";

const steps = [
  { icon: Users, title: "Refer a driver", text: "Share your referral link or code with another NSW taxi driver." },
  { icon: Gift, title: "They sign up", text: "Once they complete setup and take their first fare, the referral is confirmed." },
  { icon: DollarSign, title: "You both get rewarded", text: "A bonus lands in your TaxiCharg balance, and so does theirs." },
];

export default function ReferralPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <SubpageHero
          eyebrow="Referral program"
          title="Bring a mate onto TaxiCharg"
          subtitle="Refer another driver and you'll both be rewarded once they're up and running."
        />
        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-8">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl brand-gradient flex items-center justify-center mb-5">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-xs font-semibold text-orange-500">Step {i + 1}</p>
                <h3 className="mt-1 font-bold text-navy-900">{title}</h3>
                <p className="mt-2 text-sm text-navy-600">{text}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link href="/login" className="inline-block px-7 py-3.5 rounded-full font-semibold text-white brand-gradient hover:opacity-90">
              Get your referral link
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

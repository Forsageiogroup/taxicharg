import Image from "next/image";
import Link from "next/link";
import { Wallet, Clock, Lock } from "lucide-react";

const features = [
  { icon: Clock, text: "Access your earnings as you make them, not days later" },
  { icon: Wallet, text: "Spend straight from the card &mdash; no transfer required" },
  { icon: Lock, text: "Bank-grade security on every transaction" },
];

export default function DriverCardPromo() {
  return (
    <section className="py-20 bg-navy-950/[0.02]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-14 items-center">
        <div className="flex justify-center">
          <Image
            src="/logo.png"
            alt="TaxiCharg driver card"
            width={440}
            height={440}
            className="w-64 sm:w-80 h-auto -rotate-3 drop-shadow-xl rounded-3xl"
          />
        </div>

        <div>
          <span className="text-sm font-semibold text-orange-500 uppercase tracking-wide">
            TaxiCharg Driver Card
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
            Instant access to your money, as you earn it
          </h2>
          <p className="mt-5 text-navy-600 leading-relaxed">
            Every fare settles straight to your TaxiCharg Driver Card, so
            your earnings are ready to spend the moment your shift ends
            &mdash; no waiting on bank transfers.
          </p>
          <ul className="mt-6 space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-navy-700">
                <span className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-orange-500" />
                </span>
                <span dangerouslySetInnerHTML={{ __html: text }} />
              </li>
            ))}
          </ul>
          <Link
            href="/driver-card"
            className="inline-block mt-8 px-7 py-3.5 rounded-full font-semibold text-white brand-gradient hover:opacity-90 transition-opacity"
          >
            Find out more
          </Link>
        </div>
      </div>
    </section>
  );
}

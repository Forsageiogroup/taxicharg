import Link from "next/link";
import { Headset } from "lucide-react";

export default function SupportSection() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl brand-gradient p-10 sm:p-16 flex flex-col lg:flex-row items-center justify-between gap-8 text-white">
          <div className="flex items-start gap-5 max-w-2xl">
            <Headset className="w-10 h-10 shrink-0 mt-1" />
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                A support team that knows the taxi trade
              </h2>
              <p className="mt-3 text-white/90">
                Our customer success specialists help you get set up, sort
                out settlement questions, and keep your EFTPOS machine
                running &mdash; every day of the week.
              </p>
            </div>
          </div>
          <Link
            href="/support/contact"
            className="shrink-0 px-7 py-3.5 rounded-full font-semibold bg-white text-navy-900 hover:bg-navy-50 transition-colors whitespace-nowrap"
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </section>
  );
}

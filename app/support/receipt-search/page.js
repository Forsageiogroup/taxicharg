"use client";

import { useState } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SubpageHero from "@/components/site/SubpageHero";
import { Search } from "lucide-react";

export default function ReceiptSearchPage() {
  const [query, setQuery] = useState({ reference: "", date: "" });
  const [searched, setSearched] = useState(false);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <SubpageHero
          eyebrow="Receipt search"
          title="Find a fare receipt"
          subtitle="Passengers and drivers can look up a receipt using the trip reference or date."
        />
        <section className="py-16 sm:py-20 bg-white">
          <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearched(true);
              }}
              className="rounded-2xl border border-navy-900/5 card-shadow p-6 sm:p-8 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Trip reference</label>
                <input
                  value={query.reference}
                  onChange={(e) => setQuery({ ...query, reference: e.target.value })}
                  placeholder="e.g. TC-284910"
                  className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Date of trip</label>
                <input
                  type="date"
                  value={query.date}
                  onChange={(e) => setQuery({ ...query, date: e.target.value })}
                  className="w-full rounded-lg border border-navy-900/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-white brand-gradient hover:opacity-90"
              >
                <Search className="w-4 h-4" /> Search
              </button>
            </form>

            {searched && (
              <p className="mt-6 text-center text-sm text-navy-500">
                No receipt found for those details. Double-check your trip reference, or{" "}
                <a href="/support/contact" className="font-semibold text-orange-600">
                  contact support
                </a>
                .
              </p>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

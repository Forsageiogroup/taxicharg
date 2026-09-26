import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import SubpageHero from "@/components/site/SubpageHero";

export default function LegalPage({ title, updated, draft = true, children }) {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <SubpageHero eyebrow="Legal" title={title} subtitle={`Last updated ${updated}`} />
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            {draft && (
              <div className="rounded-xl bg-amber-50 text-amber-800 text-sm px-5 py-4 mb-10">
                This is placeholder legal text for a starting template. Replace it with copy
                reviewed by a lawyer for your actual business, licensing and financial-services
                obligations before going live.
              </div>
            )}
            <div className="legal space-y-5 text-navy-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-navy-900 [&_h2]:mt-10 [&_h2]:mb-2 [&_h3]:font-bold [&_h3]:text-navy-900 [&_h3]:mt-6 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-green-600 [&_a]:font-semibold">{children}</div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

import { Quote } from "lucide-react";
import Reveal from "../motion/Reveal";
import { testimonials } from "@/lib/testimonials";

/** The "what drivers say" row. Nothing shows until lib/testimonials.js has real quotes. */
export default function Testimonials() {
  if (!testimonials.length) return null;
  return (
    <section id="drivers" className="tc-grid py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>
            What drivers say
          </h2>
        </Reveal>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Reveal key={t.name + i} delay={i * 0.1} className="rounded-2xl bg-white border border-navy-900/5 p-8 card-shadow">
              <Quote className="w-8 h-8 text-green-500" />
              <p className="mt-4 text-navy-700 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 font-bold text-navy-900">{t.name}</div>
              {t.detail && <div className="text-sm text-navy-500">{t.detail}</div>}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

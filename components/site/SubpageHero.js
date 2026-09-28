import Facets from "./art/Facets";

/**
 * The inside-page hero (27 Sept): the green facets, navy words. Each page
 * passes its own `seed` so the facets fall differently on each one.
 */
export default function SubpageHero({ eyebrow, title, subtitle, seed = 11, children }) {
  return (
    <section className="relative overflow-hidden text-white">
      <Facets seed={seed} className="absolute inset-0 w-full h-full" />
      <div className="tc-facet-veil absolute inset-0" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
        {eyebrow && (
          <span className="inline-block rounded-full bg-navy-deep/90 text-neon text-xs font-semibold uppercase tracking-wider px-3.5 py-1.5 mb-5">
            {eyebrow}
          </span>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight" style={{ textWrap: "balance" }}>{title}</h1>
        {subtitle && <p className="mt-4 text-white/80 max-w-2xl mx-auto">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}

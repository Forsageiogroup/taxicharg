export default function SubpageHero({ eyebrow, title, subtitle }) {
  return (
    <section className="navy-gradient text-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
        {eyebrow && (
          <span className="inline-block text-xs font-semibold uppercase tracking-wide text-green-300 mb-4">
            {eyebrow}
          </span>
        )}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-4 text-white/70 max-w-2xl mx-auto">{subtitle}</p>}
      </div>
    </section>
  );
}

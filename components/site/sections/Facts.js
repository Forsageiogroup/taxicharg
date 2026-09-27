import CountUp from "../motion/CountUp";
import Reveal from "../motion/Reveal";

/**
 * The counting strip (27 Sept). Every figure here is a plain fact of how
 * TaxiCharg works, taken from the site's own words - NOT a performance
 * number. Real totals (drivers on board, fares taken, money paid out) go
 * here the day the owner supplies them; nothing is made up in the meantime.
 */
const facts = [
  { n: 2, suffix: " min", label: "to apply online" },
  { n: 3, label: "steps to your first fare" },
  { n: 3, label: "ways to get paid: card, bank or cash" },
  { n: 0, label: "lock-in contracts" },
];

export default function Facts() {
  return (
    <section className="tc-wash border-y border-green-600/15">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {facts.map((f, i) => (
          <Reveal key={f.label} delay={i * 0.08} className="text-center lg:text-left lg:border-l lg:border-green-600/20 lg:pl-6 first:border-0 first:pl-0">
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-navy-deep">
              <CountUp to={f.n} suffix={f.suffix || ""} />
            </div>
            <div className="mt-1 text-sm font-medium text-navy-600">{f.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

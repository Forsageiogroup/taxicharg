import { Settings2, TrendingUp, Gift } from "lucide-react";

const items = [
  {
    icon: Settings2,
    title: "Easy setup",
    body: "Get configured with everything you need to start taking fares &mdash; most drivers are up and running the same day.",
  },
  {
    icon: TrendingUp,
    title: "Earn more",
    body: "Industry-competitive commissions with no hidden fees, so more of every fare stays with you.",
  },
  {
    icon: Gift,
    title: "Rewards",
    body: "Unlock added perks and driver rewards the longer you're with TaxiCharg.",
  },
];

export default function ValueProps() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {items.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-navy-900/5 p-8 card-shadow hover:-translate-y-1 transition-transform"
            >
              <div className="w-12 h-12 rounded-xl brand-gradient flex items-center justify-center mb-5">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-navy-900">{title}</h3>
              <p
                className="mt-2 text-sm text-navy-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

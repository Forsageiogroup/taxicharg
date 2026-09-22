const steps = [
  { n: "1", title: "Apply online", body: "Two minutes. Tell us who you are and where you drive; we set up your account and call you back." },
  { n: "2", title: "Collect your terminal", body: "Pick it up from our office, already registered to you. We show you the ropes before you leave." },
  { n: "3", title: "Take fares, get paid", body: "Every card fare lands on your dashboard. Withdraw when you like, the way you like." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative overflow-hidden navy-gradient text-white py-20">
      <div className="tc-streaks absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight" style={{ textWrap: "balance" }}>
          Up and running <span className="brand-gradient-text">in three steps</span>
        </h2>
        <p className="mt-3 text-white/70 max-w-2xl mx-auto">
          We are a Sydney taxi network first, so the terminal, the paperwork and the support all come from people who know the job.
        </p>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl bg-white text-navy-900 p-8 text-left card-shadow">
              <span className="inline-flex w-10 h-10 rounded-full brand-gradient text-white font-extrabold items-center justify-center">{s.n}</span>
              <h3 className="mt-5 text-xl font-extrabold">{s.title}</h3>
              <p className="mt-2 text-navy-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

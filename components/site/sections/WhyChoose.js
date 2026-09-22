import TerminalArt from "../art/TerminalArt";

export default function WhyChoose() {
  return (
    <section className="bg-[#f6f7f9] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-navy-900" style={{ textWrap: "balance" }}>
          Why drivers choose a TaxiCharg terminal
        </h2>
        <p className="mt-3 text-navy-500">Because the fare is yours &mdash; the terminal should make it easy to keep.</p>
        <div className="mt-10 flex justify-center">
          <TerminalArt size={420} className="w-[300px] sm:w-[420px] h-auto" />
        </div>
      </div>
    </section>
  );
}

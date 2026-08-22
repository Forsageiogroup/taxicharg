import { Radio } from "lucide-react";

/**
 * TaxiCharg wordmark. `dark` controls whether the neutral letters render
 * white (for use on navy/dark backgrounds) or navy (for light backgrounds).
 */
export default function Logo({ dark = false, className = "" }) {
  const neutral = dark ? "text-white" : "text-navy-900";
  return (
    <span className={`inline-flex items-center gap-1.5 font-extrabold tracking-tight ${className}`}>
      <span className={neutral}>TAXI</span>
      <span className="relative inline-flex items-center justify-center">
        <span className="brand-gradient text-white rounded-full w-[1.05em] h-[1.05em] inline-flex items-center justify-center text-[0.85em] leading-none">
          C
        </span>
      </span>
      <span className="text-orange-500">HARG</span>
      <Radio className="w-[0.6em] h-[0.6em] text-orange-400 rotate-45 -ml-1" strokeWidth={3} />
    </span>
  );
}

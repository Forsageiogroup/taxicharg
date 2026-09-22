/**
 * The TaxiCharg logo: the roof-sign mark (a bolt whose top is a contactless
 * tap) and the wordmark. `dark` sets the neutral letters white for navy
 * backgrounds. The mark is inline SVG so it is crisp at any size and needs
 * no request; the same drawing lives in public/logo-mark.svg for files.
 */
export function Mark({ size = 32, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tcMarkG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#faa638" />
          <stop offset="0.55" stopColor="#f97d23" />
          <stop offset="1" stopColor="#eb5835" />
        </linearGradient>
        <linearGradient id="tcMarkGl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.55" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect x="2" y="2" width="96" height="96" rx="26" fill="url(#tcMarkG)" />
      <path d="M56 16 L30 56 H48 L42 84 L70 44 H52 Z" fill="#ffffff" />
      <path d="M64 24 a12 12 0 0 1 0 17" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      <path d="M72 17 a22 22 0 0 1 0 31" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.75" />
      <path d="M80 10 a32 32 0 0 1 0 45" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
      <path d="M14 6 H86 Q94 6 94 14 V38 Q50 60 6 38 V14 Q6 6 14 6 Z" fill="url(#tcMarkGl)" />
    </svg>
  );
}

export default function Logo({ dark = false, className = "", mark = true }) {
  const neutral = dark ? "text-white" : "text-navy-900";
  return (
    <span className={`inline-flex items-center gap-2 font-display font-black tracking-tight ${className}`}>
      {mark && <Mark size={30} className="w-[1.55em] h-[1.55em] shrink-0" />}
      <span className="leading-none"><span className={neutral}>TAXI</span><span className="text-orange-500">CHARG</span></span>
    </span>
  );
}

/**
 * The TaxiCharg logo (26 Sept): a green front-on taxi with a white bolt
 * through it, contactless waves and a lime dot, on a deep-navy rounded
 * square; and the wordmark. `dark` sets the neutral letters white for navy
 * backgrounds. The mark is inline SVG so it is crisp at any size and needs
 * no request; the same drawing lives in public/logo-mark.svg for files and
 * in the driver app's brand.dart - change all of them together.
 */
export function Mark({ size = 32, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect width="100" height="100" rx="24" fill="#0e2148" />
      <g transform="translate(7 7) scale(0.86)">
        <rect x="39" y="13" width="14" height="7" rx="2.5" fill="#56cd7b"/>
        <rect x="25" y="19" width="42" height="33" rx="9" fill="#56cd7b"/>
        <rect x="31" y="25" width="30" height="15" rx="4" fill="#fff"/>
        <rect x="12" y="44" width="68" height="36" rx="8" fill="#56cd7b"/>
        <rect x="17" y="55" width="12" height="6" rx="3" fill="#fff"/>
        <rect x="63" y="55" width="12" height="6" rx="3" fill="#fff"/>
        <rect x="18" y="78" width="12" height="9" rx="2.5" fill="#3fb068"/>
        <rect x="62" y="78" width="12" height="9" rx="2.5" fill="#3fb068"/>
        <polygon points="63,7 36,52 51,52 42,93 72,40 57,40" fill="#0e2148" stroke="#0e2148" strokeWidth="3.2" strokeLinejoin="round"/>
        <polygon points="63,7 36,52 51,52 42,93 72,40 57,40" fill="#fff"/>
        <path d="M70.61 25.12 A8 8 0 0 1 79.88 31.61" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round"/>
        <path d="M69.57 19.21 A14 14 0 0 1 85.79 30.57" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round"/>
        <path d="M68.53 13.30 A20 20 0 0 1 91.70 29.53" fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round"/>
        <circle cx="72" cy="33" r="3.2" fill="#64e008"/>
      </g>
    </svg>
  );
}

export default function Logo({ dark = false, className = "", mark = true }) {
  const neutral = dark ? "text-white" : "text-navy-900";
  return (
    <span className={`inline-flex items-center gap-2 font-display font-black tracking-tight ${className}`}>
      {mark && <Mark size={30} className="w-[1.55em] h-[1.55em] shrink-0" />}
      <span className="leading-none"><span className={neutral}>TAXI</span><span className="text-green-500">CHARG</span></span>
    </span>
  );
}

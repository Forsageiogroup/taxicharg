/** The TaxiCharg Driver Card, drawn. */
export default function CardArt({ className = "" }) {
  return (
    <svg viewBox="0 0 400 260" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tcCardBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#26313d" /><stop offset="1" stopColor="#0a0e13" /></linearGradient>
        <linearGradient id="tcCardO" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7adb97" /><stop offset="0.55" stopColor="#56cd7b" /><stop offset="1" stopColor="#3fb068" /></linearGradient>
        <linearGradient id="tcCardGl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.55" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
        <linearGradient id="tcCardSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0" /><stop offset="0.45" stopColor="#ffffff" stopOpacity="0.12" /><stop offset="0.55" stopColor="#ffffff" stopOpacity="0.12" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
        <filter id="tcCardSh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#0a0e13" floodOpacity="0.35" /></filter>
      </defs>
      <g transform="rotate(-8 200 130)" filter="url(#tcCardSh)">
        <rect x="30" y="30" width="340" height="210" rx="20" fill="url(#tcCardBg)" />
        <rect x="30" y="30" width="340" height="210" rx="20" fill="none" stroke="#ffffff" strokeOpacity="0.08" />
        <g transform="translate(52 52) scale(0.5)">
          <rect x="2" y="2" width="96" height="96" rx="26" fill="url(#tcCardO)" />
          <path d="M56 16 L30 56 H48 L42 84 L70 44 H52 Z" fill="#ffffff" />
          <path d="M64 24 a12 12 0 0 1 0 17" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
          <path d="M72 17 a22 22 0 0 1 0 31" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.75" />
          <path d="M80 10 a32 32 0 0 1 0 45" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
          <path d="M14 6 H86 Q94 6 94 14 V38 Q50 60 6 38 V14 Q6 6 14 6 Z" fill="url(#tcCardGl)" />
        </g>
        <clipPath id="tcCardClip"><rect x="30" y="30" width="340" height="210" rx="20" /></clipPath>
        <polygon points="120,30 260,30 190,240 60,240" fill="url(#tcCardSheen)" clipPath="url(#tcCardClip)" />
        <rect x="30" y="30" width="340" height="1.5" rx="1" fill="#ffffff" opacity="0.35" />
        <rect x="52" y="122" width="52" height="38" rx="7" fill="#7adb97" />
        <path d="M60 141h36M78 122v38M60 131h36M60 151h36" stroke="#3fb068" strokeWidth="2" opacity="0.6" />
        <g fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.85">
          <path d="M318 62 a12 12 0 0 1 0 18" /><path d="M309 53 a24 24 0 0 1 0 36" />
        </g>
        <text x="52" y="204" fontFamily="Urbanist, Montserrat, system-ui, sans-serif" fontWeight="900" fontSize="26" letterSpacing="-0.6"><tspan fill="#ffffff">TAXI</tspan><tspan fill="#56cd7b">CHARG</tspan></text>
        <text x="52" y="224" fontFamily="Sora, system-ui, sans-serif" fontSize="10" fill="#9aa5b1" letterSpacing="2.5">DRIVER CARD</text>
        <text x="348" y="224" textAnchor="end" fontFamily="Sora, system-ui, sans-serif" fontSize="11" fill="#9aa5b1" letterSpacing="1">•••• 4821</text>
      </g>
    </svg>
  );
}

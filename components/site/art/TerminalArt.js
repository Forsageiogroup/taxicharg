/**
 * The TaxiCharg terminal, drawn - so the site never depends on a stock
 * photo. `card` adds a card tapping the screen; `size` is the width.
 * Pure SVG, animates with CSS (see globals.css: .tc-tap, .tc-ring).
 */
export default function TerminalArt({ card = true, className = "", size = 360 }) {
  return (
    <svg viewBox="0 0 420 520" width={size} height={(size * 520) / 420} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tcBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e6e9ee" />
        </linearGradient>
        <linearGradient id="tcScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c2530" />
          <stop offset="1" stopColor="#0a0e13" />
        </linearGradient>
        <linearGradient id="tcGreen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7adb97" />
          <stop offset="0.5" stopColor="#56cd7b" />
          <stop offset="1" stopColor="#3fb068" />
        </linearGradient>
        <linearGradient id="tcCard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#26313d" />
          <stop offset="1" stopColor="#0a0e13" />
        </linearGradient>
        <linearGradient id="tcGl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0.55" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
        <linearGradient id="tcSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity="0" /><stop offset="0.45" stopColor="#ffffff" stopOpacity="0.14" /><stop offset="0.55" stopColor="#ffffff" stopOpacity="0.14" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
        <filter id="tcShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#0a0e13" floodOpacity="0.28" />
        </filter>
        <filter id="tcSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#0a0e13" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* body */}
      <g filter="url(#tcShadow)">
        <rect x="120" y="40" width="210" height="440" rx="34" fill="url(#tcBody)" />
        <rect x="120" y="40" width="210" height="440" rx="34" fill="none" stroke="#cfd4db" strokeWidth="2" />
      </g>
      {/* printer slot + camera */}
      <rect x="165" y="58" width="120" height="6" rx="3" fill="#b9c0c9" />
      <circle cx="225" cy="84" r="5" fill="#0a0e13" />
      <circle cx="225" cy="84" r="2" fill="#4a5a68" />
      {/* screen */}
      <rect x="140" y="102" width="170" height="300" rx="14" fill="url(#tcScreen)" />
      {/* the mark on the screen - the same drawing as Logo.js / logo-mark.svg */}
      <g transform="translate(190 176) scale(0.7)">
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
      </g>
      <g fontFamily="Urbanist, Montserrat, system-ui, sans-serif" fontWeight="900" textAnchor="middle">
        <text x="225" y="288" fontSize="24" letterSpacing="-0.5"><tspan fill="#ffffff">TAXI</tspan><tspan fill="#56cd7b">CHARG</tspan></text>
      </g>
      <text x="225" y="322" fontFamily="Inter, system-ui, sans-serif" fontSize="11" fill="#9aa5b1" textAnchor="middle" letterSpacing="2">
        TAP · INSERT · SWIPE
      </text>
      {/* glass: a diagonal sheen across the screen, a highlight down the body's left edge */}
      <clipPath id="tcScreenClip"><rect x="140" y="102" width="170" height="300" rx="14" /></clipPath>
      <polygon points="120,140 260,102 330,102 160,402 120,402" fill="url(#tcSheen)" clipPath="url(#tcScreenClip)" />
      <rect x="126" y="60" width="6" height="400" rx="3" fill="#ffffff" opacity="0.55" />
      {/* contactless mark on screen */}
      <g className="tc-ring" fill="none" stroke="#56cd7b" strokeWidth="3" strokeLinecap="round" opacity="0.9">
        <path d="M212 356 a18 18 0 0 1 0 26" />
        <path d="M204 348 a30 30 0 0 1 0 42" />
        <path d="M196 340 a42 42 0 0 1 0 58" />
      </g>
      {/* card slot + home dot */}
      <rect x="150" y="448" width="150" height="5" rx="2.5" fill="#b9c0c9" />
      <circle cx="225" cy="425" r="4" fill="#b9c0c9" />

      {card && (
        <g className="tc-tap" filter="url(#tcSoft)">
          <g transform="translate(-58 150) rotate(-14 110 210)">
            <rect x="20" y="150" width="190" height="120" rx="14" fill="url(#tcCard)" />
            <rect x="20" y="150" width="190" height="120" rx="14" fill="none" stroke="#ffffff" strokeOpacity="0.08" />
            <rect x="40" y="178" width="34" height="26" rx="5" fill="#7adb97" />
            <path d="M46 191h22M57 178v26" stroke="#3fb068" strokeWidth="2" opacity="0.7" />
            <g fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
              <path d="M180 176 a8 8 0 0 1 0 12" />
              <path d="M174 170 a15 15 0 0 1 0 24" />
            </g>
            <text x="40" y="246" fontFamily="Urbanist, Montserrat, system-ui, sans-serif" fontSize="14" fontWeight="900" letterSpacing="-0.3"><tspan fill="#ffffff">TAXI</tspan><tspan fill="#56cd7b">CHARG</tspan></text>
            <text x="40" y="228" fontFamily="Inter, system-ui, sans-serif" fontSize="9" fill="#9aa5b1" letterSpacing="1.5">DRIVER CARD</text>
          </g>
        </g>
      )}
    </svg>
  );
}

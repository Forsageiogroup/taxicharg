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
        <linearGradient id="tcOrange" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#faa638" />
          <stop offset="0.5" stopColor="#f97d23" />
          <stop offset="1" stopColor="#eb5835" />
        </linearGradient>
        <linearGradient id="tcCard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#26313d" />
          <stop offset="1" stopColor="#0a0e13" />
        </linearGradient>
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
      <g fontFamily="Inter, system-ui, sans-serif" fontWeight="800" textAnchor="middle">
        <text x="225" y="228" fontSize="22" fill="#ffffff" letterSpacing="1">TAXI</text>
        <circle cx="225" cy="252" r="15" fill="url(#tcOrange)" />
        <text x="225" y="258" fontSize="17" fill="#ffffff">C</text>
        <text x="225" y="296" fontSize="22" fill="#f97d23" letterSpacing="1">HARG</text>
      </g>
      <text x="225" y="322" fontFamily="Inter, system-ui, sans-serif" fontSize="11" fill="#9aa5b1" textAnchor="middle" letterSpacing="2">
        TAP · INSERT · SWIPE
      </text>
      {/* contactless mark on screen */}
      <g className="tc-ring" fill="none" stroke="#f97d23" strokeWidth="3" strokeLinecap="round" opacity="0.9">
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
            <rect x="40" y="178" width="34" height="26" rx="5" fill="#faa638" />
            <path d="M46 191h22M57 178v26" stroke="#eb5835" strokeWidth="2" opacity="0.7" />
            <g fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
              <path d="M180 176 a8 8 0 0 1 0 12" />
              <path d="M174 170 a15 15 0 0 1 0 24" />
            </g>
            <text x="40" y="246" fontFamily="Inter, system-ui, sans-serif" fontSize="13" fontWeight="700" fill="#ffffff" letterSpacing="1.5">TAXI</text>
            <text x="78" y="246" fontFamily="Inter, system-ui, sans-serif" fontSize="13" fontWeight="700" fill="#f97d23" letterSpacing="1.5">CHARG</text>
            <text x="40" y="228" fontFamily="Inter, system-ui, sans-serif" fontSize="9" fill="#9aa5b1" letterSpacing="1.5">DRIVER CARD</text>
          </g>
        </g>
      )}
    </svg>
  );
}

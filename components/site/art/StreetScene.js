/**
 * A Sydney street at night, drawn (28 Sept): towers with lit windows, a
 * wet road with headlight streaks, and a taxi with its roof light on. Pure
 * SVG, our own, so the About page never depends on a stock photo. Sized by
 * the parent; keeps its 16:10 shape.
 */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

export default function StreetScene({ className = "", seed = 5 }) {
  const r = rng(seed);
  // the skyline: a row of towers of different heights, each with windows
  const towers = [];
  let x = 0;
  while (x < 800) {
    const w = 40 + Math.floor(r() * 70);
    const h = 120 + Math.floor(r() * 220);
    towers.push({ x, w, h });
    x += w + 6 + Math.floor(r() * 14);
  }
  const windows = [];
  towers.forEach((t) => {
    for (let wy = 500 - t.h + 14; wy < 490; wy += 16) {
      for (let wx = t.x + 8; wx < t.x + t.w - 8; wx += 14) {
        if (r() < 0.45) windows.push({ x: wx, y: wy, lit: r() < 0.35 });
      }
    }
  });
  return (
    <svg viewBox="0 0 800 500" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ssSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#07122b" /><stop offset="1" stopColor="#0e2148" /></linearGradient>
        <linearGradient id="ssRoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#101c36" /><stop offset="1" stopColor="#060c1c" /></linearGradient>
        <linearGradient id="ssStreak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#25c45f" stopOpacity="0" /><stop offset="0.5" stopColor="#4ade80" stopOpacity="0.9" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
        <linearGradient id="ssStreakW" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#ffffff" stopOpacity="0" /><stop offset="0.5" stopColor="#ffffff" stopOpacity="0.7" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
        <radialGradient id="ssGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#4ade80" stopOpacity="0.55" /><stop offset="1" stopColor="#4ade80" stopOpacity="0" /></radialGradient>
        <linearGradient id="ssCab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6f1d3" /><stop offset="1" stopColor="#d9cf9a" /></linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#ssSky)" />
      {/* a green glow low on the skyline */}
      <ellipse cx="400" cy="480" rx="520" ry="160" fill="url(#ssGlow)" />
      {/* towers */}
      {towers.map((t, i) => <rect key={i} x={t.x} y={500 - t.h} width={t.w} height={t.h} fill="#0b1833" />)}
      {windows.map((w, i) => <rect key={i} x={w.x} y={w.y} width="6" height="8" fill={w.lit ? "#4ade80" : "#1a2e55"} opacity={w.lit ? 0.9 : 0.8} />)}
      {/* the road, in perspective */}
      <polygon points="0,500 800,500 520,330 280,330" fill="url(#ssRoad)" />
      <polygon points="392,330 408,330 430,500 370,500" fill="#16a34a" opacity="0.18" />
      {/* light streaks */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={60 + i * 40} y={352 + i * 26} width={560 - i * 60} height={4 - i * 0.4} rx="2" fill={i % 2 ? "url(#ssStreakW)" : "url(#ssStreak)"} transform={`skewX(${-14 + i * 4})`} />
      ))}
      <rect x="150" y="470" width="620" height="6" rx="3" fill="url(#ssStreak)" opacity="0.8" />
      {/* the taxi */}
      <g transform="translate(470 372)">
        <rect x="0" y="34" width="180" height="58" rx="12" fill="url(#ssCab)" />
        <rect x="26" y="8" width="118" height="42" rx="12" fill="url(#ssCab)" />
        <rect x="34" y="14" width="46" height="26" rx="5" fill="#0e2148" opacity="0.85" />
        <rect x="88" y="14" width="48" height="26" rx="5" fill="#0e2148" opacity="0.85" />
        <rect x="66" y="-4" width="40" height="12" rx="3" fill="#16a34a" />
        <text x="86" y="5" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontWeight="800" fontSize="8" fill="#ffffff">TAXI</text>
        <rect x="6" y="56" width="20" height="10" rx="3" fill="#fff5c2" />
        <rect x="154" y="56" width="20" height="10" rx="3" fill="#ff3b42" />
        <circle cx="40" cy="94" r="14" fill="#0a1734" /><circle cx="40" cy="94" r="6" fill="#26313d" />
        <circle cx="140" cy="94" r="14" fill="#0a1734" /><circle cx="140" cy="94" r="6" fill="#26313d" />
        {/* headlight beam */}
        <polygon points="0,58 -160,40 -160,86" fill="#fff5c2" opacity="0.12" />
      </g>
    </svg>
  );
}

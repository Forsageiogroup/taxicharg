/**
 * The faceted ground (27 Sept): a low-poly mesh of green (or navy) triangles
 * behind the heroes, drawn by code so it is ours and needs no picture. The
 * mesh comes from a jittered grid and a seeded random, so the same seed
 * draws the same picture on the server and in the browser (no hydration
 * drift) and every page has its own pattern.
 *
 *   tone="bright"  the brand greens, for navy text on top
 *   tone="deep"    navy facets with a few green ones lit, for white text
 */
const W = 1200;
const H = 600;

const PALETTES = {
  bright: ["#03c963", "#04e372", "#04ff7f", "#2eff93", "#4dff9f"],
  deep: ["#0a1734", "#0e2148", "#123063", "#183a74", "#0e2148"],
};

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  const v = A.map((x, i) => Math.round(x + (B[i] - x) * t));
  return "#" + v.map((x) => x.toString(16).padStart(2, "0")).join("");
}
function shade(palette, t) {
  const k = Math.min(Math.max(t, 0), 0.9999) * (palette.length - 1);
  const i = Math.floor(k);
  return mix(palette[i], palette[i + 1], k - i);
}

export default function Facets({ tone = "bright", seed = 7, cols = 14, rows = 7, className = "" }) {
  const r = rng(seed);
  const palette = PALETTES[tone] || PALETTES.bright;
  const pts = [];
  for (let j = 0; j <= rows; j++) {
    const row = [];
    for (let i = 0; i <= cols; i++) {
      const jx = i > 0 && i < cols ? (r() - 0.5) * (W / cols) * 0.75 : 0;
      const jy = j > 0 && j < rows ? (r() - 0.5) * (H / rows) * 0.75 : 0;
      row.push([(i * W) / cols + jx, (j * H) / rows + jy]);
    }
    pts.push(row);
  }
  const tris = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i + 1], d = pts[j + 1][i];
      const pair = r() < 0.5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const t of pair) {
        const cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
        const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
        // lighter towards the top right, with a little grain per facet
        let v = (cx / W) * 0.55 + (1 - cy / H) * 0.3 + (r() - 0.5) * 0.3;
        let fill = shade(palette, v);
        if (tone === "deep" && r() < 0.045) fill = "#146a44"; // a lit facet, dimmed
        tris.push({ d: `M${t[0][0].toFixed(1)} ${t[0][1].toFixed(1)}L${t[1][0].toFixed(1)} ${t[1][1].toFixed(1)}L${t[2][0].toFixed(1)} ${t[2][1].toFixed(1)}Z`, fill });
      }
    }
  }
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
    >
      {tris.map((t, i) => (
        <path key={i} d={t.d} fill={t.fill} stroke={t.fill} strokeWidth="0.8" />
      ))}
    </svg>
  );
}

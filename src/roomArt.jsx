import { Children, cloneElement, isValidElement } from 'react';
// Storybook-style room decor for the bookshelf room. Each entry draws at its natural size
// (viewBox 0 0 w h). Shelf/floor things stand on y = h; wall things hang from inside the box.

const INK = '#3d3121';
const O = { stroke: INK, strokeWidth: 1.6, strokeLinejoin: 'round', strokeLinecap: 'round' };
const HL = { fill: '#fff', opacity: 0.5 };
const SH = { fill: INK, opacity: 0.13 };
const G = { leaf: '#7fa66a', dark: '#5e8a52', light: '#9cc283', pink: '#f0a8b8', rose: '#d77f95', blush: '#f5d7dd', cream: '#fbf4ea', gold: '#d9b45f', terra: '#d98c5f', wood: '#a07c5a', rattan: '#d4a86a', glow: '#f6d27a', purple: '#9d7aa8' };

// Move/scale/rotate a path made only of M/L/C/Q/Z commands with space-separated coordinate pairs.
const tp = (d, x = 0, y = 0, s = 1, r = 0) => {
  const a = (r * Math.PI) / 180, c = Math.cos(a), n = Math.sin(a);
  return d.replace(/(-?\d*\.?\d+)[ ,]+(-?\d*\.?\d+)/g, (_, u, v) => `${+(x + (u * c - v * n) * s).toFixed(2)} ${+(y + (u * n + v * c) * s).toFixed(2)}`);
};
const qpt = (a, b, c, t) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t * t * c[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t * t * c[1]];
// A line drawn with an outline (outer ink stroke under a coloured stroke).
const cord = (d, c, w = 2) => (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={INK} strokeWidth={w + 1.8} />
    <path d={d} stroke={c} strokeWidth={w} />
  </g>
);

const LEAF = 'M0 0C5 -5 13 -6 20 0C13 6 5 5 0 0Z';
const leaf = (x, y, s, r, c = G.leaf) => (
  <g>
    <path d={tp(LEAF, x, y, s, r)} fill={c} {...O} />
    <path d={tp('M3 0L15 0', x, y, s, r)} stroke={INK} strokeWidth="1" opacity=".3" strokeLinecap="round" />
  </g>
);
const HEART = 'M0 9C-12 1 -9 -9 0 -3.5C9 -9 12 1 0 9Z';
const BOW = ['M-2 2L-8 15L-4.5 13L-2.5 16L1 3Z', 'M2 2L8 15L4.5 13L2.5 16L-1 3Z', 'M-2 -1C-6 -9 -15 -10 -15 -2C-15 6 -7 6 -2 2Z', 'M2 -1C6 -9 15 -10 15 -2C15 6 7 6 2 2Z'];
const bow = (x, y, s, c = G.pink, sh = G.rose) => (
  <g>
    {BOW.map((d, i) => <path key={i} d={tp(d, x, y, s)} fill={c} {...O} />)}
    <path d={tp('M-4 -1.5C-7 -5 -11 -5.5 -12.5 -2.5M4 -1.5C7 -5 11 -5.5 12.5 -2.5', x, y, s)} stroke={sh} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    <path d={tp('M-3 -3.5C-1 -4.5 1 -4.5 3 -3.5L3 3.5C1 4.5 -1 4.5 -3 3.5Z', x, y, s)} fill={sh} {...O} />
  </g>
);
const flame = (cx, y) => (
  <g>
    <circle cx={cx} cy={y - 5} r="8" fill={G.glow} opacity=".28" />
    <path d={`M${cx} ${y - 12}C${cx + 5} ${y - 6} ${cx + 4} ${y} ${cx} ${y}C${cx - 4} ${y} ${cx - 5} ${y - 6} ${cx} ${y - 12}Z`} fill="#f3b94e" {...O} />
    <path d={`M${cx} ${y - 6.5}C${cx + 2} ${y - 4} ${cx + 1.6} ${y - 1.2} ${cx} ${y - 1.2}C${cx - 1.6} ${y - 1.2} ${cx - 2} ${y - 4} ${cx} ${y - 6.5}Z`} fill="#fbe6a6" />
  </g>
);
// Moon phases for the garland: 0 crescent, 1 half, 2 gibbous, 3 full; flip mirrors to the waning side.
const moon = (cx, cy, r, phase, flip) => {
  const d = phase === 3 ? null
    : phase === 1 ? `M${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx} ${cy + r}Z`
      : phase === 0 ? `M${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx} ${cy + r}A${r * 0.55} ${r} 0 0 0 ${cx} ${cy - r}Z`
        : `M${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx} ${cy + r}A${r * 0.55} ${r} 0 0 1 ${cx} ${cy - r}Z`;
  return (
    <g transform={flip ? `translate(${2 * cx} 0) scale(-1 1)` : undefined}>
      {d && <circle cx={cx} cy={cy} r={r} fill="#efe6d2" {...O} />}
      {d ? <path d={d} fill="#f3d98a" {...O} /> : <circle cx={cx} cy={cy} r={r} fill="#f3d98a" {...O} />}
      <circle cx={phase === 0 ? cx + r * 0.72 : cx + r * 0.35} cy={cy - r * 0.35} r={r * 0.16} {...HL} />
    </g>
  );
};
const nail = (x, y) => <circle cx={x} cy={y} r="2" fill="#8a7a62" {...O} strokeWidth="1.2" />;

// ---------- Pot colours ----------
export const POT_COLORS = ['#d98c5f', '#f3eee6', '#a9b89a', '#f0b2c2', '#3a3633', '#8fa8bf', '#d9a93f', '#b9a3cf'];
const hex6 = (c) => (c.length === 4 ? '#' + [...c.slice(1)].map((x) => x + x).join('') : c);
// Blend two hex colours (t = 0 keeps a, t = 1 gives b).
const mix = (a, b, t) => {
  const A = hex6(a), B = hex6(b);
  return '#' + [1, 3, 5].map((i) => Math.round(parseInt(A.slice(i, i + 2), 16) * (1 - t) + parseInt(B.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
};
// A picked pot colour plus its derived shade/rim/highlight; null means "draw the item's own default pot".
const potSet = (p) => (p ? { body: p, rim: mix(p, '#ffffff', 0.14), shade: mix(p, '#000000', 0.2), hl: mix(p, '#ffffff', 0.6) } : null);
const pot = (cx, y, w, h, c = G.terra, pc) => {
  const k = potSet(pc), rh = Math.max(4, h * 0.26), bw = w * 0.36, L = cx - w / 2, R = cx + w / 2, b = y + h;
  return (
    <g>
      <path d={`M${L + 2} ${y + rh}L${cx - bw} ${b - 1.5}Q${cx - bw} ${b} ${cx - bw + 1.5} ${b}L${cx + bw - 1.5} ${b}Q${cx + bw} ${b} ${cx + bw} ${b - 1.5}L${R - 2} ${y + rh}Z`} fill={k ? k.body : c} {...O} />
      <path d={`M${cx + w * 0.14} ${y + rh + 0.9}L${cx + bw * 0.4} ${b - 0.9}L${cx + bw - 1.2} ${b - 0.9}L${R - 3} ${y + rh + 0.9}Z`} {...(k ? { fill: k.shade } : SH)} />
      <rect x={L} y={y} width={w} height={rh} rx="2.5" fill={k ? k.rim : c} {...O} />
      <rect x={L + 2.5} y={y + 1.4} width={w * 0.22} height={Math.max(1.2, rh * 0.28)} rx="1" {...(k ? { fill: k.hl, opacity: 0.85 } : HL)} />
    </g>
  );
};

// ---------- Trailing vines ----------
// Pothos leaf: a soft heart with its notch at the origin and its tip pointing along +x.
const PL = 'M0 0C-1.4 -3 1.4 -6.4 5 -5.8C8.6 -5.2 11.2 -2.6 13 0C11.2 2.6 8.6 5.2 5 5.8C1.4 6.4 -1.4 3 0 0Z';
const pleaf = (x, y, s, r, c = G.leaf) => (
  <g>
    <path d={tp(PL, x, y, s, r)} fill={c} {...O} strokeWidth="1.4" />
    <path d={tp('M1.8 0Q6.5 -0.7 10.4 0', x, y, s, r)} stroke={INK} strokeWidth=".9" opacity=".3" fill="none" strokeLinecap="round" />
    <path d={tp('M4 -3.2Q6.5 -3.9 8.6 -2.6', x, y, s, r)} stroke="#fff" strokeWidth="1" opacity=".45" fill="none" strokeLinecap="round" />
  </g>
);
const VINE = [G.leaf, '#a8c46a', G.light];
const cub = (p, t) => { const u = 1 - t; return [0, 1].map((k) => u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k]); };
const cubAng = (p, t) => {
  const u = 1 - t, d = [0, 1].map((k) => 3 * u * u * (p[1][k] - p[0][k]) + 6 * u * t * (p[2][k] - p[1][k]) + 3 * t * t * (p[3][k] - p[2][k]));
  return (Math.atan2(d[1], d[0]) * 180) / Math.PI;
};
// A trailing pothos strand (one cubic curve): heart leaves on short stalks alternate left/right,
// angled outward and down, in three sizes that shrink toward the tip, ending in a small tip leaf.
const vine = (p, n, s, odd = 0) => {
  const L = Array.from({ length: n }, (_, i) => {
    const t = 0.1 + (0.74 * i) / Math.max(1, n - 1), [x, y] = cub(p, t), side = (i + odd) % 2 ? 1 : -1;
    const a = Math.min(160, Math.max(20, cubAng(p, t) + side * 62)), sz = s * [1, 0.84, 0.7][Math.min(2, Math.floor((3 * i) / n))];
    const r = (a * Math.PI) / 180;
    return { x, y, a, sz, bx: x + Math.cos(r) * 2.6, by: y + Math.sin(r) * 2.6 };
  });
  const [tx, ty] = p[3], ta = cubAng(p, 0.97) + (odd ? 12 : -12);
  return (
    <g>
      {cord(`M${p[0]}C${p[1]} ${p[2]} ${p[3]}`, '#6f9a5c', 1.2)}
      {L.map((l, i) => <g key={'p' + i}>{cord(`M${l.x} ${l.y}L${l.bx} ${l.by}`, '#6f9a5c', 0.9)}</g>)}
      {L.map((l, i) => <g key={i}>{pleaf(l.bx, l.by, l.sz, l.a, VINE[(i + odd) % 3])}</g>)}
      {pleaf(tx, ty, s * 0.55, ta, G.light)}
    </g>
  );
};
// A mound of upright heart leaves for the top of a pothos pot.
const crown = (cx, cy, s, spread = 1) => (
  <g>
    {[[-168, 0.86], [-12, 0.86], [-145, 0.95], [-35, 0.95], [-120, 1], [-60, 1], [-92, 0.92]].map(([a, k], i) => {
      const r = (a * Math.PI) / 180;
      return <g key={a}>{pleaf(cx + Math.cos(r) * 4 * spread, cy + Math.sin(r) * 2, s * k, a, VINE[i % 3])}</g>;
    })}
  </g>
);

// ---------- Cats (tabby + tortie, plain and one per vibe) ----------
const TABBY = { kind: 'tabby', base: '#e3a065', mark: '#b5672e', mark2: '#c97d40', light: '#f7dcb8', eye: '#9cc283', ear: '#e8a0b0', mouth: '#8a5a3a', whisk: '#8a5a3a' };
const TORTIE = { kind: 'tortie', base: '#2f2a30', mark: '#c9773a', mark2: '#e3a35e', light: '#e3a35e', eye: '#f3c94a', ear: '#c98a96', mouth: '#6b6070', whisk: '#8a8090' };
const blob = (cx, cy, rx, ry, c) => (
  <path d={`M${cx - rx} ${cy}C${cx - rx} ${cy - ry * 1.1} ${cx + rx * 0.3} ${cy - ry * 1.2} ${cx + rx} ${cy - ry * 0.3}C${cx + rx * 1.1} ${cy + ry * 0.6} ${cx + rx * 0.2} ${cy + ry * 1.1} ${cx - rx * 0.4} ${cy + ry * 0.9}C${cx - rx * 0.9} ${cy + ry * 0.8} ${cx - rx} ${cy + ry * 0.4} ${cx - rx} ${cy}Z`} fill={c} />
);
// Tortie brindle: little scattered flecks of orange/caramel so the black reads mottled, not patched.
const fleck = (c, x0, y0, w, h, n, seed = 1) => Array.from({ length: n }, (_, i) => {
  const f = (k) => { const v = Math.sin((i + 1) * 12.9898 + seed * 78.233 + k) * 43758.5453; return v - Math.floor(v); };
  return <ellipse key={i} cx={x0 + f(0) * w} cy={y0 + f(1) * h} rx={0.7 + f(2) * 0.9} ry={0.5 + f(3) * 0.6} transform={`rotate(${f(4) * 180} ${x0 + f(0) * w} ${y0 + f(1) * h})`} fill={i % 2 ? c.mark : c.mark2} />;
});
// Fill a shape, paint coat markings clipped to it, then outline it on top.
const patched = (id, d, c, marks) => (
  <g>
    <defs><clipPath id={id}><path d={d} /></clipPath></defs>
    <path d={d} fill={c.base} />
    <g clipPath={`url(#${id})`}>{marks}</g>
    <path d={d} fill="none" {...O} />
  </g>
);
const catTail = (d, c) => (
  <g>
    {cord(d, c.base, 5)}
    <path d={d} stroke={c.mark} strokeWidth="5" fill="none" strokeDasharray={c.kind === 'tabby' ? '2.6 3' : '8 4 3 10'} />
  </g>
);
// Tabby back stripes running down from the spine (y0) across a horizontal body.
const backStripes = (c, x0, x1, y0, y1, n) => Array.from({ length: n }, (_, i) => {
  const x = x0 + ((x1 - x0) * i) / (n - 1);
  return <path key={i} d={`M${x - 1.5} ${y0 - 2}Q${x + 2.5} ${(y0 + y1) / 2} ${x - 1} ${y1}`} stroke={c.mark} strokeWidth="2.4" fill="none" strokeLinecap="round" />;
});
const catHead = (id, c, cx, cy, { sleep, minimal } = {}) => {
  const r = 13, d = `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;
  const tab = c.kind === 'tabby';
  return (
    <g>
      <path d={`M${cx - 12} ${cy - 5}L${cx - 10.5} ${cy - 18}L${cx - 2.5} ${cy - 11}Z`} fill={tab ? c.base : c.mark} {...O} />
      <path d={`M${cx + 3.5} ${cy - 11}L${cx + 11} ${cy - 18}L${cx + 12.5} ${cy - 5}Z`} fill={c.base} {...O} />
      <path d={`M${cx - 9.8} ${cy - 9}L${cx - 9.2} ${cy - 14.5}L${cx - 5.6} ${cy - 11.4}Z`} fill={c.ear} />
      <path d={`M${cx + 6.8} ${cy - 11.4}L${cx + 10.2} ${cy - 14.5}L${cx + 10.6} ${cy - 9}Z`} fill={c.ear} />
      {patched(id, d, c, tab ? (
        <g>
          <ellipse cx={cx} cy={cy + 7} rx="7.5" ry="5.5" fill={c.light} />
          <path d={`M${cx - 4.5} ${cy - 13}L${cx - 3.2} ${cy - 7}M${cx} ${cy - 14}V${cy - 7.5}M${cx + 4.5} ${cy - 13}L${cx + 3.2} ${cy - 7}`} stroke={c.mark} strokeWidth="1.9" strokeLinecap="round" />
          {!minimal && <path d={`M${cx - 14} ${cy + 1}L${cx - 9} ${cy + 1.8}M${cx - 14} ${cy + 4.5}L${cx - 9.5} ${cy + 4.8}M${cx + 14} ${cy + 1}L${cx + 9} ${cy + 1.8}M${cx + 14} ${cy + 4.5}L${cx + 9.5} ${cy + 4.8}`} stroke={c.mark} strokeWidth="1.8" strokeLinecap="round" />}
        </g>
      ) : (
        <g>
          <path d={`M${cx - 15} ${cy - 15}C${cx - 5} ${cy - 13} ${cx - 2} ${cy - 5} ${cx - 5} ${cy + 1}C${cx - 7} ${cy + 6} ${cx - 13} ${cy + 7} ${cx - 15} ${cy + 1}Z`} fill={c.mark} />
          {blob(cx + 9, cy + 6, 4.5, 3.4, c.mark2)}
          {!minimal && blob(cx + 7, cy - 9, 2.6, 2, c.mark)}
          {fleck(c, cx - 2, cy - 13, 13, 9, minimal ? 4 : 8, cx + cy)}
          <path d={`M${cx - 1.2} ${cy - 14}C${cx - 1.8} ${cy - 7} ${cx - 1.2} ${cy - 1} ${cx - 0.4} ${cy + 3.5}H${cx + 1.4}C${cx + 1.2} ${cy - 2} ${cx + 1.6} ${cy - 8} ${cx + 1.2} ${cy - 14}Z`} fill={c.mark2} />
        </g>
      ))}
      {sleep ? (
        <path d={`M${cx - 8} ${cy + 0.5}Q${cx - 5.5} ${cy + 2.8} ${cx - 3} ${cy + 0.5}M${cx + 3} ${cy + 0.5}Q${cx + 5.5} ${cy + 2.8} ${cx + 8} ${cy + 0.5}`} stroke={INK} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      ) : (
        <g>
          <ellipse cx={cx - 5.5} cy={cy} rx="3.2" ry="3.7" fill={c.eye} stroke={INK} strokeWidth=".8" />
          <ellipse cx={cx + 5.5} cy={cy} rx="3.2" ry="3.7" fill={c.eye} stroke={INK} strokeWidth=".8" />
          <ellipse cx={cx - 5.5} cy={cy + 0.3} rx="1" ry="2.7" fill="#1f1b1d" />
          <ellipse cx={cx + 5.5} cy={cy + 0.3} rx="1" ry="2.7" fill="#1f1b1d" />
          <circle cx={cx - 6.4} cy={cy - 1.4} r=".8" fill="#fff" />
          <circle cx={cx + 4.6} cy={cy - 1.4} r=".8" fill="#fff" />
        </g>
      )}
      <path d={`M${cx - 1.3} ${cy + 4.4}H${cx + 1.3}L${cx} ${cy + 5.9}Z`} fill="#e88fa5" />
      <path d={`M${cx} ${cy + 5.9}Q${cx - 1.4} ${cy + 7.7} ${cx - 2.6} ${cy + 6.7}M${cx} ${cy + 5.9}Q${cx + 1.4} ${cy + 7.7} ${cx + 2.6} ${cy + 6.7}`} stroke={c.mouth} strokeWidth=".9" fill="none" strokeLinecap="round" />
      {!minimal && <path d={`M${cx - 9} ${cy + 4}L${cx - 17} ${cy + 3}M${cx - 9} ${cy + 6}L${cx - 16} ${cy + 7.5}M${cx + 9} ${cy + 4}L${cx + 17} ${cy + 3}M${cx + 9} ${cy + 6}L${cx + 16} ${cy + 7.5}`} stroke={c.whisk} strokeWidth=".8" strokeLinecap="round" />}
    </g>
  );
};
const SITB = 'M10 60C5 46 12 30 22 30C34 30 41 46 36 60Z';
const sitCat = (id, c) => (
  <g>
    {catTail('M34 57C47 57 50 46 44 38', c)}
    {patched(id + '-b', SITB, c, c.kind === 'tabby' ? (
      <g>
        <ellipse cx="22.5" cy="48" rx="7" ry="13" fill={c.light} />
        <path d="M5 42Q10 41 13 44.5M4.5 48.5Q10 47.5 13 51M5 55Q10 54 13 57M40 42Q35 41 32 44.5M40.5 48.5Q35 47.5 32 51M40 55Q35 54 32 57M14 34Q17.5 33 19 36.5M31 34Q27.5 33 26 36.5" stroke={c.mark} strokeWidth="2.3" fill="none" strokeLinecap="round" />
      </g>
    ) : (
      <g>
        {blob(9, 46, 7, 6, c.mark)}
        {blob(32, 39, 6, 5, c.mark2)}
        {blob(25, 55, 6, 4, c.mark)}
        {blob(17, 36, 3, 2.5, c.mark2)}
        {blob(36, 52, 3, 3, c.mark)}
        {fleck(c, 8, 32, 30, 28, 22, 3)}
      </g>
    ))}
    <ellipse cx="17" cy="58.4" rx="4" ry="2" fill={c.kind === 'tabby' ? c.light : c.mark2} {...O} strokeWidth="1.2" />
    <ellipse cx="28" cy="58.4" rx="4" ry="2" fill={c.kind === 'tabby' ? c.light : c.base} {...O} strokeWidth="1.2" />
    {catHead(id + '-h', c, 23, 22)}
  </g>
);
const pearlCollar = () => Array.from({ length: 7 }, (_, i) => {
  const [x, y] = qpt([13, 33], [23, 40.5], [33, 33], 0.08 + i * 0.14);
  return <circle key={i} cx={x} cy={y} r="1.7" fill="#fffaf1" stroke={INK} strokeWidth=".8" />;
});
const witchHat = () => (
  <g>
    <path d="M16.5 10C17.5 4 20.5 -2 28 -7C25.5 -1 28 4 29.5 10Z" fill="#3b2e4a" {...O} />
    <path d="M17.2 6.6Q23 8.6 28.8 6.6" stroke={G.gold} strokeWidth="2.4" fill="none" />
    <ellipse cx="23" cy="10" rx="11.5" ry="2.8" fill="#4a3a5c" {...O} />
    <path d={tp('M0 -2.4L0.6 -0.6L2.4 0L0.6 0.6L0 2.4L-0.6 0.6L-2.4 0L-0.6 -0.6Z', 24.5, 0)} fill={G.gold} />
    <path d="M19 4L19.8 0.5" stroke="#fff" strokeWidth="1.2" opacity=".35" strokeLinecap="round" />
  </g>
);
const moonCollar = () => (
  <g>
    <path d="M13 33Q23 40.5 33 33" stroke="#5b4a72" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M24.6 37.4A3.4 3.4 0 1 0 24.6 43.4A2.6 2.6 0 1 1 24.6 37.4Z" fill="#f3d98a" stroke={INK} strokeWidth=".9" strokeLinejoin="round" />
  </g>
);
const LOAFB = 'M6 46C3 34 10 22 26 22H42C54 22 60 34 57 46Z';
const loafCat = (id, c) => (
  <g>
    {patched(id + '-b', LOAFB, c, c.kind === 'tabby' ? (
      <g>
        <ellipse cx="32" cy="48" rx="24" ry="6" fill={c.light} />
        {backStripes(c, 33, 53, 22, 35, 4)}
      </g>
    ) : (
      <g>
        {blob(40, 28, 7, 5, c.mark)}
        {blob(53, 39, 5, 6, c.mark2)}
        {fleck(c, 22, 24, 34, 20, 12, 5)}
      </g>
    ))}
    {catTail('M56 42.5C53 46.5 40 46.5 33 44.5', c)}
    <ellipse cx="14" cy="44.6" rx="4.2" ry="1.8" fill={c.kind === 'tabby' ? c.light : c.mark2} {...O} strokeWidth="1.2" />
    <ellipse cx="25" cy="44.6" rx="4.2" ry="1.8" fill={c.kind === 'tabby' ? c.light : c.base} {...O} strokeWidth="1.2" />
    {catHead(id + '-h', c, 20, 25, { minimal: true })}
  </g>
);
const CURLB = 'M10 58C4 50 12 34 32 34C50 34 60 42 58 58Z';
const plantCat = (id, c, pc) => (
  <g>
    {[-165, -20, -135, -50, -100, -78].map((a, i) => <g key={a}>{leaf(64, 32, 0.95, a, i % 2 ? G.light : G.leaf)}</g>)}
    {pot(64, 30, 30, 28, G.terra, pc)}
    {patched(id + '-b', CURLB, c, c.kind === 'tabby' ? (
      <g>
        <ellipse cx="34" cy="60" rx="22" ry="6" fill={c.light} />
        {backStripes(c, 28, 54, 34, 47, 5)}
      </g>
    ) : (
      <g>
        {blob(31, 40, 7, 5, c.mark)}
        {blob(48, 43, 6, 6, c.mark2)}
        {blob(41, 54, 6, 4, c.mark)}
        {blob(24, 53, 4, 3, c.mark2)}
        {fleck(c, 22, 36, 34, 20, 20, 7)}
      </g>
    ))}
    {catTail('M57 52C54 57.5 36 57.5 26 55', c)}
    {catHead(id + '-h', c, 18, 44, { sleep: true })}
  </g>
);
const POUFB = 'M14 47C10 35 22 26 40 26C56 26 64 35 62 47Z';
const poufCat = (id, c) => (
  <g>
    {cord('M7 49L5 57', '#c9965a', 1.2)}
    {cord('M69 49L71 57', '#c9965a', 1.2)}
    <path d="M3 57H7L7.6 62.5Q5 64 2.4 62.5Z" fill="#c96f4a" {...O} strokeWidth="1.2" />
    <path d="M69 57H73L73.6 62.5Q71 64 68.4 62.5Z" fill="#c96f4a" {...O} strokeWidth="1.2" />
    <path d="M6 44C6 61 20 66 38 66C56 66 70 61 70 44Z" fill="#d9b88a" {...O} />
    <path d="M7.5 51C20 58 56 58 68.5 51M10 57.5C22 63 54 63 66 57.5" stroke="#b8935e" strokeWidth="2.2" strokeDasharray="3 2" fill="none" />
    <path d="M54 50C60 50 66 48 69 46C68 55 62 61 52 64C56 58 56 54 54 50Z" {...SH} />
    <ellipse cx="38" cy="44" rx="32" ry="9" fill="#e6caa0" {...O} />
    <ellipse cx="38" cy="44" rx="22" ry="6" fill="none" stroke="#b8935e" strokeWidth="1" strokeDasharray="2 2" />
    {catTail('M60 41C69 43 70 51 66 58', c)}
    {patched(id + '-b', POUFB, c, c.kind === 'tabby' ? (
      <g>
        <ellipse cx="38" cy="49" rx="24" ry="5" fill={c.light} />
        {backStripes(c, 33, 57, 26, 39, 5)}
      </g>
    ) : (
      <g>
        {blob(44, 31, 7, 4.5, c.mark)}
        {blob(57, 40, 5, 5, c.mark2)}
        {blob(32, 42, 6, 4, c.mark)}
        {fleck(c, 26, 27, 34, 18, 20, 9)}
      </g>
    ))}
    <ellipse cx="14" cy="47" rx="4.2" ry="1.9" fill={c.kind === 'tabby' ? c.light : c.mark2} {...O} strokeWidth="1.2" />
    <ellipse cx="25" cy="47.4" rx="4.2" ry="1.9" fill={c.kind === 'tabby' ? c.light : c.base} {...O} strokeWidth="1.2" />
    {catHead(id + '-h', c, 20, 31)}
    {[-150, -122, -96, -70, -42].map((a, i) => {
      const t = (a * Math.PI) / 180, x = 20 + 12.6 * Math.cos(t), y = 31 + 12.6 * Math.sin(t);
      return (
        <g key={a}>
          {i < 4 && leaf(x, y, 0.28, a + 70, G.leaf)}
          <circle cx={x} cy={y} r="2.5" fill={['#f0a8b8', '#f3d98a', '#fffaf1', '#f3d98a', '#f0a8b8'][i]} stroke={INK} strokeWidth=".9" />
          <circle cx={x} cy={y} r=".9" fill="#d98c5f" />
        </g>
      );
    })}
  </g>
);
const catSet = (p, c, L) => ({
  [p + 'Cat']: { name: `${L} cat`, w: 50, h: 60, where: 'shelf', set: ['cozy', 'plant', 'boho', 'coquette', 'witchy', 'minimal'], art: () => sitCat(p + 'Cat', c) },
  [p + 'Coquette']: { name: `${L} · coquette bow`, w: 50, h: 60, where: 'shelf', set: ['coquette', 'cozy'], art: () => <g>{sitCat(p + 'Coquette', c)}{pearlCollar()}{bow(31, 10.5, 0.55)}</g> },
  [p + 'Witchy']: { name: `${L} · witch hat`, w: 50, h: 70, where: 'shelf', set: ['witchy'], art: () => <g transform="translate(0 10)">{sitCat(p + 'Witchy', c)}{moonCollar()}{witchHat()}</g> },
  [p + 'Plant']: { name: `${L} · napping by a plant`, w: 80, h: 58, where: 'shelf', set: ['plant'], pots: true, art: ({ pot: pc } = {}) => plantCat(p + 'Plant', c, pc) },
  [p + 'Minimal']: { name: `${L} · loaf`, w: 62, h: 46, where: 'shelf', set: ['minimal'], art: () => loafCat(p + 'Minimal', c) },
  [p + 'Boho']: { name: `${L} · on a pouf`, w: 76, h: 66, where: 'shelf', set: ['boho'], art: () => poufCat(p + 'Boho', c) },
});

// ---------- Candle wax ----------
// ivory, blush, red, burgundy, black, sage, lilac, honey, blue
export const WAX_COLORS = ['#fbf4ea', '#f2b8c6', '#c95a55', '#6e2a2f', '#2b2a2a', '#a9b89a', '#c9b2f2', '#f3d98a', '#8fa8bf'];
// A picked wax colour plus derived shade/drip/highlight; null means "draw the item's own wax".
const waxSet = (w) => (w ? { body: w, top: mix(w, '#000000', 0.07), shade: mix(w, '#000000', 0.2), drip: mix(w, '#ffffff', 0.4), hl: mix(w, '#ffffff', 0.65) } : null);

// ---------- Light strings ----------
// warm white, cool white, pink, gold, ice blue, lilac, amber, rainbow
export const LIGHT_COLORS = ['#ffe6a3', '#fff6e0', '#ffb3c7', '#f6c453', '#a8d8ff', '#c9b2f2', '#ff8a65', 'rainbow'];
const RAINBOW = ['#ffb3c7', '#ffc9a3', '#f6dc6a', '#b5e0a0', '#a8d8ff', '#c9b2f2'];
const WARM = [G.glow, '#f3b562', '#f7e0a0'];
// Bulb i's colour: picked hex, rainbow cycle, or the original warm mix when undefined.
const lightCol = (light, i) => (light === 'rainbow' ? RAINBOW[i % RAINBOW.length] : light || WARM[i % WARM.length]);
const SWAG = [[[2, 8], [56, 36], [110, 12]], [[110, 12], [164, 36], [218, 8]]];
const swagPts = (ts) => SWAG.flatMap(([a, b, c]) => ts.map((t) => qpt(a, b, c, t)));
const wire = () => (
  <g>
    <path d="M2 8Q56 36 110 12Q164 36 218 8" stroke="#5e5040" strokeWidth="1.2" fill="none" />
    {nail(2, 8)}
    {nail(218, 8)}
  </g>
);
const star5 = (x, y, r) => Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.48 : r;
  return `${i ? 'L' : 'M'}${(x + rr * Math.cos(a)).toFixed(2)} ${(y + rr * Math.sin(a)).toFixed(2)}`;
}).join('') + 'Z';

// ---------- Furniture tints ----------
// light oak, walnut, white, matte black, blush, sage, dusty blue, mustard, lilac, terracotta, cream
export const FURN_COLORS = ['#d6a96f', '#7a5236', '#f4f1ea', '#3a3633', '#f0b9c4', '#a9b89a', '#8fa8bf', '#d9a93f', '#b9a3cf', '#c9744f', '#efe4cc'];
const OAK = FURN_COLORS[0];
const DARKWOOD = '#5e4636';
// Warm brown at middling lightness and saturation reads as wood (gets grain); anything else reads as paint.
const woody = (c) => {
  const h = hex6(c), [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  if (!d || mx !== r || g < b) return false;
  const hue = ((g - b) / d) * 60, s = d / (1 - Math.abs(2 * l - 1));
  return hue >= 20 && hue <= 38 && l > 0.2 && l < 0.7 && s > 0.2 && s < 0.62;
};
// A picked furniture colour (or the piece's default) plus everything derived from it.
const tintSet = (t, def = OAK) => {
  const c = t || def;
  return { c, top: mix(c, '#ffffff', 0.14), shade: mix(c, '#000000', 0.2), deep: mix(c, '#000000', 0.4), hl: mix(c, '#ffffff', 0.6), grain: mix(c, '#000000', 0.32), wood: woody(c) };
};
const GR = [[0.06, 0.5], [0.34, 0.94], [0.14, 0.7], [0.48, 0.88]];
// Faint wavy grain across a board (wood tints only).
const grain = (k, x, y, w, h, n = 2) => (k.wood ? (
  <path d={Array.from({ length: n }, (_, i) => { const [a, b] = GR[i % 4], yy = y + (h * (i + 1)) / (n + 1); return `M${x + w * a} ${yy}Q${x + (w * (a + b)) / 2} ${yy - 1.3} ${x + w * b} ${yy + 0.3}`; }).join('')} stroke={k.grain} strokeWidth=".9" opacity=".6" fill="none" strokeLinecap="round" />
) : null);
// A straight tapered leg; back legs are drawn in the shade colour.
const leg = (k, x, y0, y1, w0, w1, back) => {
  const a = w0 / 2, b = w1 / 2;
  return (
    <g>
      <path d={`M${x - a} ${y0}H${x + a}L${x + b} ${y1 - 1.5}Q${x + b} ${y1} ${x + b - 1.5} ${y1}H${x - b + 1.5}Q${x - b} ${y1} ${x - b} ${y1 - 1.5}Z`} fill={back ? k.shade : k.c} {...O} />
      {!back && <path d={`M${x + a * 0.2} ${y0 + 1}H${x + a - 1}L${x + b - 1} ${y1 - 1.5}H${x + b * 0.2}Z`} fill={k.shade} />}
      {!back && w0 > 7 && <path d={`M${x - a + 2.2} ${y0 + 4}L${x - b + 2.2} ${y0 + (y1 - y0) * 0.5}`} stroke={k.hl} strokeWidth="1.3" opacity=".75" strokeLinecap="round" />}
    </g>
  );
};
// A top board seen front-on.
const slab = (k, x, y, w, h, rx = 3) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={rx} fill={k.top} {...O} />
    {grain(k, x, y, w, h, h > 10 ? 2 : 1)}
    <rect x={x + rx + 3} y={y + 1.8} width={Math.min(56, w * 0.3)} height="1.8" rx=".9" fill={k.hl} opacity=".85" />
  </g>
);
const knob = (x, y, r = 2.6) => (
  <g>
    <circle cx={x} cy={y} r={r} fill={G.gold} {...O} strokeWidth="1.1" />
    <circle cx={x - r * 0.35} cy={y - r * 0.4} r={r * 0.32} fill="#fff" opacity=".7" />
  </g>
);
const pull = (x, y, w = 16) => (
  <g>
    <rect x={x - w / 2} y={y - 1.8} width={w} height="3.6" rx="1.8" fill={G.gold} {...O} strokeWidth="1.1" />
    <rect x={x - w / 2 + 2.2} y={y - 0.9} width={w * 0.32} height="1" rx=".5" fill="#fff" opacity=".7" />
  </g>
);
// A drawer front; kind 'knob' (one centred knob) or 'pulls' (two bar pulls).
const drawer = (k, x, y, w, h, kind = 'knob') => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="2" fill={k.c} {...O} strokeWidth="1.4" />
    <path d={`M${x + 2.4} ${y + h - 2.2}H${x + w - 2.4}`} stroke={k.shade} strokeWidth="2" strokeLinecap="round" />
    {grain(k, x, y, w, h - 2, 1)}
    {kind === 'knob' ? knob(x + w / 2, y + h / 2 - 0.5) : <g>{pull(x + w * 0.25, y + h / 2 - 0.5)}{pull(x + w * 0.75, y + h / 2 - 0.5)}</g>}
  </g>
);

// ---------- Furniture dress-up accessories ----------
export const ACC_STYLES = [['coquette', 'Coquette'], ['witchy', 'Witchy'], ['plant', 'Plant'], ['minimal', 'Minimal'], ['boho', 'Boho']];
const AC = {
  coquette: { c: '#f5c6d0', d: '#e391a6', t: '#fffaf1' },
  witchy: { c: '#5b3a5e', d: '#3e2742', t: G.gold },
  plant: { c: '#a9b89a', d: '#87987a', t: '#e6eedc' },
  minimal: { c: '#efe6d6', d: '#d9cbb6', t: '#fffaf1' },
  boho: { c: '#d9a93f', d: '#c96f4a', t: '#f1e6d0' },
};
const STAR4 = 'M0 -3L0.8 -0.8L3 0L0.8 0.8L0 3L-0.8 0.8L-3 0L-0.8 -0.8Z';
const MOONP = 'M0.2 -1C-0.5 -1.05 -1 -0.55 -1 0C-1 0.55 -0.5 1.05 0.2 1C-0.2 0.7 -0.36 0.35 -0.36 0C-0.36 -0.35 -0.2 -0.7 0.2 -1Z';
const PIL = 'M-1 -0.9Q0 -0.76 1 -0.9Q0.9 0 1 0.9Q0 0.78 -1 0.9Q-0.9 0 -1 -0.9Z';
const tassel = (x, y, c) => (
  <g>
    <path d={`M${x - 1.3} ${y + 1.6}L${x - 2.4} ${y + 7.4}Q${x} ${y + 8.6} ${x + 2.4} ${y + 7.4}L${x + 1.3} ${y + 1.6}Z`} fill={c} {...O} strokeWidth="1.1" />
    <circle cx={x} cy={y + 1.2} r="1.8" fill={c} stroke={INK} strokeWidth="1" />
  </g>
);
const zig = (x0, x1, y, h, step = 5) => {
  const n = Math.max(2, Math.round((x1 - x0) / step));
  return Array.from({ length: n + 1 }, (_, i) => `${i ? 'L' : 'M'}${x0 + ((x1 - x0) * i) / n} ${y + (i % 2 ? -h : h)}`).join('');
};
// Little prints scattered across a strip in an accessory's style.
const motif = (acc, x0, x1, y0, y1) => {
  const n = Math.max(1, Math.round((x1 - x0) / 20)), ym = (y0 + y1) / 2;
  const xs = Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * (i + 0.5)) / n);
  if (acc === 'coquette') return <g>{xs.map((x, i) => <path key={i} d={tp(HEART, x, ym + (i % 2 ? 1.5 : -1.5), 0.24)} fill={AC.coquette.d} />)}</g>;
  if (acc === 'witchy') return <g>{xs.map((x, i) => <path key={i} d={tp(STAR4, x, ym + (i % 2 ? 1.5 : -1.5), 0.8)} fill={G.gold} />)}</g>;
  if (acc === 'plant') {
    return (
      <g>
        {xs.map((x, i) => (
          <g key={i}>
            <path d={tp(LEAF, x, ym + 2.5, 0.36, i % 2 ? -40 : -140)} fill={AC.plant.t} opacity=".9" />
            <path d={tp(LEAF, x, ym + 2.5, 0.28, i % 2 ? -110 : -70)} fill={AC.plant.t} opacity=".7" />
          </g>
        ))}
      </g>
    );
  }
  if (acc === 'boho') return <path d={zig(x0, x1, ym, Math.min(2.4, (y1 - y0) / 3))} stroke={AC.boho.d} strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />;
  return null;
};
// Tiny things that sit on a table top (standing on y).
const candleStub = (x, y) => (
  <g>
    <circle cx={x} cy={y - 11} r="5" fill={G.glow} opacity=".3" />
    <rect x={x - 3.5} y={y - 7} width="7" height="7.4" rx="1.2" fill="#efe0c4" {...O} strokeWidth="1.2" />
    <path d={`M${x - 3} ${y - 6}H${x + 3}V${y - 5}C${x + 2} ${y - 4} ${x + 1.4} ${y - 4.6} ${x + 1} ${y - 3.6}C${x + 0.6} ${y - 2.6} ${x - 0.4} ${y - 2.6} ${x - 0.6} ${y - 4}C${x - 1.6} ${y - 4.4} ${x - 2.6} ${y - 4.2} ${x - 3} ${y - 5}Z`} fill="#fbf3e3" />
    <path d={`M${x} ${y - 7}V${y - 8.6}`} stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
    <path d={`M${x} ${y - 15.4}C${x + 2.6} ${y - 12.6} ${x + 2} ${y - 9} ${x} ${y - 9}C${x - 2} ${y - 9} ${x - 2.6} ${y - 12.6} ${x} ${y - 15.4}Z`} fill="#f3b94e" {...O} strokeWidth="1.1" />
    <path d={`M${x} ${y - 12.4}C${x + 1} ${y - 11.2} ${x + 0.8} ${y - 10} ${x} ${y - 10}C${x - 0.8} ${y - 10} ${x - 1} ${y - 11.2} ${x} ${y - 12.4}Z`} fill="#fbe6a6" />
  </g>
);
const sproutPot = (x, y) => (
  <g>
    {cord(`M${x} ${y - 8}V${y - 12}`, '#6f9a5c', 1)}
    {leaf(x, y - 12, 0.36, -150, '#86b06f')}
    {leaf(x, y - 12, 0.36, -30, G.leaf)}
    {pot(x, y - 9, 13, 9.4, G.terra)}
  </g>
);
const dish = (x, y) => (
  <g>
    <path d={`M${x - 9} ${y - 4.4}Q${x - 8} ${y} ${x} ${y}Q${x + 8} ${y} ${x + 9} ${y - 4.4}Z`} fill="#f3eee6" {...O} strokeWidth="1.3" />
    <path d={`M${x + 3} ${y - 3}Q${x + 7} ${y - 3.2} ${x + 8} ${y - 4}Q${x + 6.6} ${y - 0.8} ${x + 2} ${y - 0.6}Z`} {...SH} />
    <ellipse cx={x} cy={y - 4.4} rx="9" ry="1.8" fill="#e3dccf" {...O} strokeWidth="1.2" />
    <circle cx={x - 2} cy={y - 5.4} r="1.7" fill="#8f8a84" stroke={INK} strokeWidth=".9" />
  </g>
);
// A cloth over a table top whose front edge spans x0..x1 at y, hanging `drop` below it.
// Coquette: full lace tablecloth; witchy: pointed altar cloth; plant/minimal/boho: runners.
const cloth = (acc, x0, x1, y, drop, { oval, at = 0.7 } = {}) => {
  if (!acc) return null;
  const W = x1 - x0, cx = (x0 + x1) / 2, frac = { coquette: 1.03, witchy: 0.56, plant: 0.42, minimal: 0.3, boho: 0.44 }[acc];
  const a = cx - (W * frac) / 2, b = cx + (W * frac) / 2, yb = y + drop, tx = a + (b - a) * at;
  const yt = oval && acc !== 'coquette' && acc !== 'witchy' ? y - oval * 0.85 : y - 1;
  const top = `M${a} ${yt + 3}Q${a} ${yt} ${a + 3} ${yt}H${b - 3}Q${b} ${yt} ${b} ${yt + 3}`;
  const cap = (c) => oval && (acc === 'coquette' || acc === 'witchy') && <ellipse cx={cx} cy={y} rx={(b - a) / 2} ry={oval} fill={c} {...O} />;
  const folds = (c) => [0.22, 0.5, 0.78].map((f) => <path key={f} d={`M${a + (b - a) * f} ${y + 3}Q${a + (b - a) * f + 1.2} ${(y + yb) / 2} ${a + (b - a) * f} ${yb - 1}`} stroke={c} strokeWidth="1.2" opacity=".55" fill="none" strokeLinecap="round" />);
  if (acc === 'coquette') {
    const n = Math.max(3, Math.round((b - a) / 10)), xs = Array.from({ length: n + 1 }, (_, i) => b - ((b - a) * i) / n);
    const sc = xs.slice(1).map((x, i) => `Q${(x + xs[i]) / 2} ${yb + 5.5} ${x} ${yb}`).join('');
    return (
      <g>
        <path d={`${top}V${yb}${sc}Z`} fill={AC.coquette.c} {...O} />
        {cap(AC.coquette.c)}
        {folds(AC.coquette.d)}
        <path d={`M${a + 2} ${yb - 1.6}H${b - 2}`} stroke={AC.coquette.t} strokeWidth="1.6" strokeDasharray="1.6 2.2" strokeLinecap="round" />
        {xs.slice(1).map((x, i) => <circle key={i} cx={(x + xs[i]) / 2} cy={yb + 2.4} r="1.1" fill={AC.coquette.t} />)}
        {bow(cx, y + drop * 0.42 + (oval ? oval * 0.5 : 0), 0.5)}
      </g>
    );
  }
  if (acc === 'witchy') {
    const W2 = '#4a2030';
    return (
      <g>
        <path d={`${top}V${yb}L${cx} ${yb + 9}L${a} ${yb}Z`} fill={W2} {...O} />
        {cap(W2)}
        <path d={`M${a + 3} ${y + 3}V${yb - 1.5}L${cx} ${yb + 6}L${b - 3} ${yb - 1.5}V${y + 3}`} stroke={G.gold} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
        <circle cx={cx} cy={y + drop * 0.55} r="4" fill={G.gold} />
        <circle cx={cx + 1.8} cy={y + drop * 0.55 - 0.9} r="3.4" fill={W2} />
        <path d={tp(STAR4, cx - 10, y + drop * 0.5, 0.7)} fill={G.gold} />
        <path d={tp(STAR4, cx + 10, y + drop * 0.62, 0.55)} fill={G.gold} />
        {tassel(cx, yb + 8, G.gold)}
        {candleStub(tx, y + 1)}
      </g>
    );
  }
  const s = AC[acc], fill = acc === 'boho' ? s.t : acc === 'minimal' ? '#e9dfcc' : s.c;
  return (
    <g>
      {acc === 'boho' && Array.from({ length: Math.round((b - a - 4) / 3) + 1 }, (_, i) => a + 2 + i * 3).filter((x) => x <= b - 2).map((x) => <path key={x} d={`M${x} ${yb}V${yb + 5}`} stroke="#c9b48c" strokeWidth="1.2" strokeLinecap="round" />)}
      <path d={`${top}V${yb}H${a}Z`} fill={fill} {...O} />
      {acc === 'plant' && motif('plant', a + 2, b - 2, y + 1, yb - 4)}
      {acc === 'plant' && <path d={`M${a + 2.5} ${yb - 2.6}H${b - 2.5}`} stroke={s.d} strokeWidth="1" strokeDasharray="2 1.8" />}
      {acc === 'minimal' && <path d={`M${a + 2} ${yb - 3}H${b - 2}`} stroke={s.d} strokeWidth="1.2" />}
      {acc === 'boho' && (
        <g>
          <rect x={a + 0.8} y={y + drop * 0.3} width={b - a - 1.6} height="3.6" fill={s.d} />
          <rect x={a + 0.8} y={y + drop * 0.62} width={b - a - 1.6} height="2.6" fill={s.c} />
          <path d={zig(a + 3, b - 3, y + drop * 0.47, 1.2, 4)} stroke={s.d} strokeWidth="1" fill="none" />
          {tassel(a + 1, yb - 1, s.d)}
          {tassel(b - 1, yb - 1, s.d)}
        </g>
      )}
      <path d={`M${a + 3} ${yt + 2.4}H${a + 3 + (b - a) * 0.3}`} stroke="#fff" strokeWidth="1.2" opacity=".55" strokeLinecap="round" />
      {acc === 'plant' && sproutPot(tx, y + 1)}
      {acc === 'minimal' && dish(tx, y + 1)}
    </g>
  );
};
// A soft seat pad sitting on a seat at y, spanning x0..x1, h tall.
const pad = (acc, x0, x1, y, h) => {
  if (!acc) return null;
  const s = AC[acc], r = h * 0.7, cx = (x0 + x1) / 2;
  const d = `M${x0} ${y}C${x0 - 1.5} ${y - h * 0.6} ${x0 + 1} ${y - h} ${x0 + r} ${y - h}H${x1 - r}C${x1 - 1} ${y - h} ${x1 + 1.5} ${y - h * 0.6} ${x1} ${y}Q${cx} ${y + 2} ${x0} ${y}Z`;
  return (
    <g>
      {acc === 'boho' && <g>{tassel(x0 + 1, y - 2.5, s.d)}{tassel(x1 - 1, y - 2.5, s.d)}</g>}
      <path d={d} fill={s.c} {...O} />
      {acc !== 'coquette' && motif(acc, x0 + r, x1 - r, y - h + 1.5, y - 1.5)}
      {acc === 'witchy' && <path d={`M${x0 + 2} ${y - 2}Q${cx} ${y} ${x1 - 2} ${y - 2}`} stroke={G.gold} strokeWidth="1.1" fill="none" />}
      {acc === 'minimal' && <path d={`M${x0 + 3} ${y - h * 0.45}Q${cx} ${y - h * 0.38} ${x1 - 3} ${y - h * 0.45}`} stroke={s.d} strokeWidth="1.1" fill="none" />}
      <path d={`M${x0 + 3} ${y - h * 0.55}Q${x0 + 4} ${y - h + 2} ${x0 + r + 4} ${y - h + 1.6}`} stroke="#fff" strokeWidth="1.3" opacity=".55" fill="none" strokeLinecap="round" />
      {acc === 'coquette' && bow(cx, y - h / 2, 0.42)}
    </g>
  );
};
// A throw pillow centred on cx, sitting on y (bottom), w wide.
const pillow = (acc, cx, y, w) => {
  if (!acc) return null;
  const s = AC[acc], hw = w / 2, cy = y - hw * 0.9;
  if (acc === 'coquette') {
    const k = w / 20, hc = y - 9 * k;
    return (
      <g>
        <path d={tp(HEART, cx, hc, k)} fill={s.c} {...O} />
        <path d={tp(HEART, cx, hc + 0.3 * k, k * 0.72)} fill="none" stroke={s.t} strokeWidth="1.2" strokeDasharray="1.6 2" strokeLinecap="round" />
        <path d={tp('M-7 -3C-6 -6 -3.5 -7 -1.6 -5.6', cx, hc, k)} stroke="#fff" strokeWidth="1.4" opacity=".6" fill="none" strokeLinecap="round" />
        {bow(cx, hc - 2.6 * k, k * 0.32)}
      </g>
    );
  }
  const body = (
    <g>
      <path d={tp(PIL, cx, cy, hw)} fill={s.c} {...O} />
      {motif(acc, cx - hw * 0.62, cx + hw * 0.62, cy - hw * 0.4, cy + hw * 0.4)}
      {acc === 'minimal' && <circle cx={cx} cy={cy} r="1.4" fill={s.d} stroke={INK} strokeWidth=".8" />}
      <path d={tp('M-0.78 -0.2Q-0.8 -0.62 -0.4 -0.7', cx, cy, hw)} stroke="#fff" strokeWidth="1.3" opacity=".55" fill="none" strokeLinecap="round" />
      {acc === 'boho' && <g>{tassel(cx - hw, cy + hw * 0.8, s.d)}{tassel(cx + hw, cy + hw * 0.8, s.d)}<circle cx={cx - hw} cy={cy - hw * 0.9} r="1.8" fill={s.d} stroke={INK} strokeWidth="1" /><circle cx={cx + hw} cy={cy - hw * 0.9} r="1.8" fill={s.d} stroke={INK} strokeWidth="1" /></g>}
    </g>
  );
  if (acc !== 'witchy') return body;
  const mr = w * 0.36, mx = cx - hw * 0.55, my = y - mr;
  return (
    <g>
      {body}
      <path d={tp(MOONP, mx, my, mr, -18)} fill="#f3d98a" {...O} />
      <path d={tp('M-0.7 -0.3Q-0.66 -0.62 -0.36 -0.8', mx, my, mr, -18)} stroke="#fff" strokeWidth="1.2" opacity=".6" fill="none" strokeLinecap="round" />
    </g>
  );
};
// A throw blanket hung over something whose top is at (x0..x1, y), hanging to yb (witchy / boho only).
const throwOver = (acc, x0, x1, y, yb, dome = 8) => {
  if (acc !== 'witchy' && acc !== 'boho') return null;
  const wi = acc === 'witchy', c = wi ? '#2f2a35' : AC.boho.t, cx = (x0 + x1) / 2;
  return (
    <g>
      {Array.from({ length: Math.round((x1 - x0 - 4) / 3) + 1 }, (_, i) => x0 + 3 + i * 3).filter((x) => x <= x1 - 2).map((x) => <path key={x} d={`M${x} ${yb + 1}V${yb + 5.5}`} stroke={wi ? '#5b3a5e' : '#c9b48c'} strokeWidth="1.3" strokeLinecap="round" />)}
      <path d={`M${x0} ${yb + 1}L${x0 + 1} ${y + dome}C${x0 + 2} ${y - dome * 0.12} ${x1 - 2} ${y - dome * 0.12} ${x1 - 1} ${y + dome}L${x1} ${yb + 1}Q${cx} ${yb + 3} ${x0} ${yb + 1}Z`} fill={c} {...O} />
      {wi ? (
        <g>
          <path d={`M${x0 + 2} ${yb - 2}Q${cx} ${yb} ${x1 - 2} ${yb - 2}`} stroke={G.gold} strokeWidth="1.1" fill="none" />
          {[[0.3, 0.45, 0.7], [0.7, 0.62, 0.55], [0.5, 0.8, 0.6]].map(([fx, fy, sz]) => <path key={fx} d={tp(STAR4, x0 + (x1 - x0) * fx, y + (yb - y) * fy, sz)} fill={G.gold} />)}
        </g>
      ) : (
        <g>
          <rect x={x0 + 1.2} y={y + (yb - y) * 0.42} width={x1 - x0 - 2.4} height="4" fill={AC.boho.d} />
          <rect x={x0 + 1.2} y={y + (yb - y) * 0.7} width={x1 - x0 - 2.4} height="3" fill={AC.boho.c} />
          <path d={zig(x0 + 3, x1 - 3, y + (yb - y) * 0.58, 1.4, 4)} stroke={AC.boho.d} strokeWidth="1" fill="none" />
        </g>
      )}
      <path d={`M${x0 + 4} ${y + dome}Q${x0 + 5} ${y + dome * 0.3 + 0.6} ${cx - 2} ${y + dome * 0.2 + 0.6}`} stroke="#fff" strokeWidth="1.3" opacity=".4" fill="none" strokeLinecap="round" />
    </g>
  );
};
const herbs = (x, y) => (
  <g>
    {cord(`M${x} ${y}V${y + 5}`, '#c9a46a', 0.8)}
    {cord(`M${x} ${y + 7}L${x - 5} ${y + 26}M${x} ${y + 7}V${y + 29}M${x} ${y + 7}L${x + 5} ${y + 26}`, '#8a7a52', 0.8)}
    {[[-5, 26, -1], [5, 26, 1], [0, 29, 0]].map(([dx, dy, sd]) => [0.45, 0.65, 0.85, 1].map((t, j) => {
      const px = x + dx * t, py = y + 7 + (dy - 7) * t, a = sd === 0 ? (j % 2 ? 60 : 120) : sd > 0 ? 50 : 130;
      return <ellipse key={dx + '-' + j} cx={px + Math.cos((a * Math.PI) / 180) * (j % 2 ? 2 : -2)} cy={py} rx="3" ry="1.6" transform={`rotate(${a} ${px} ${py})`} fill={['#a3ab7c', '#b8b083', '#8f9a6a'][j % 3]} stroke={INK} strokeWidth="1" />;
    }))}
    {[[-5, 27.5], [5, 27.5], [0, 30.5]].map(([dx, dy]) => <ellipse key={dx} cx={x + dx} cy={y + dy} rx="1.4" ry="2" fill="#b79cc4" stroke={INK} strokeWidth=".8" />)}
    <rect x={x - 3} y={y + 4} width="6" height="4.4" rx="1.6" fill="#c9a46a" {...O} strokeWidth="1.1" />
  </g>
);

// ---------- Rugs (recolorable) ----------
export const RUG_COLORS = ['#f2b8c6', '#e8a0a8', '#c96f4a', '#d9a93f', '#e3c99c', '#efe4cc', '#a9b89a', '#7f9a6a', '#8fa8bf', '#3f4a6a', '#b9a3cf', '#7a2e35', '#5b3a5e', '#3a3633', '#d9d4cc'];
const rp = (c) => ({ b: c, l: mix(c, '#ffffff', 0.42), ll: mix(c, '#ffffff', 0.72), d: mix(c, '#000000', 0.2), dd: mix(c, '#000000', 0.4) });
// Flat rectangular rugs in perspective: u runs left→right, v runs back→front.
const RP = (u, v) => { const L = 30 - 26 * v, R = 190 + 26 * v; return `${(L + (R - L) * u).toFixed(1)} ${(4 + 30 * v).toFixed(1)}`; };
const RQ = (u0, v0, u1, v1) => `M${RP(u0, v0)}L${RP(u1, v0)}L${RP(u1, v1)}L${RP(u0, v1)}Z`;
const rugEdge = (c) => <path d={`M${RP(0, 1)}L${RP(1, 1)}L${RP(1, 1).replace(/ ([\d.]+)$/, (m, y) => ' ' + (+y + 3))}L${RP(0, 1).replace(/ ([\d.]+)$/, (m, y) => ' ' + (+y + 3))}Z`} fill={c} {...O} strokeWidth="1.2" />;
const fringe = (c) => [0, 1].map((side) => Array.from({ length: 9 }, (_, i) => {
  const v = 0.06 + i * 0.11, [x, y] = RP(side, v).split(' ').map(Number), dx = side ? 6 : -6;
  return <path key={side + '-' + i} d={`M${x} ${y}L${x + dx} ${y + 0.6}`} stroke={c} strokeWidth="1.4" strokeLinecap="round" />;
}));
// Table pieces get headroom so things can sit on top; their art is drawn TH lower.
const TH = 16;

export const DECOR = {
  // ---------- Plants ----------
  monstera: {
    name: 'Monstera', w: 70, h: 90, where: 'shelf', set: ['plant', 'boho', 'cozy'], pots: true,
    art: ({ pot: pc } = {}) => {
      const L = [[13, 52, 10, -70], [58, 55, 9, 70], [22, 33, 13, -35], [55, 37, 12, 40], [39, 19, 14, 6]];
      const ML = 'M0 0.6C-0.4 1 -1 0.6 -1 0C-1 -0.55 -0.55 -0.9 0 -1.15C0.55 -0.9 1 -0.55 1 0C1 0.6 0.4 1 0 0.6Z';
      const SL = 'M-1 -0.2L-0.4 -0.08M-0.9 0.4L-0.36 0.2M1 -0.2L0.4 -0.08M0.9 0.4L0.36 0.2M-0.72 -0.7L-0.28 -0.38M0.72 -0.7L0.28 -0.38';
      return (
        <g>
          {L.map(([x, y, r, a], i) => {
            const t = (a * Math.PI) / 180, bx = x - Math.sin(t) * r * 0.6, by = y + Math.cos(t) * r * 0.6;
            return <g key={'s' + i}>{cord(`M35 66Q${35 + (bx - 35) * 0.2} ${by + 10} ${bx} ${by}`, '#6f9a5c', 1.8)}</g>;
          })}
          {L.map(([x, y, r, a], i) => (
            <g key={i}>
              <path d={tp(ML, x, y, r, a)} fill={i % 2 ? '#86b06f' : '#6f9a5c'} {...O} />
              <path d={tp(SL, x, y, r, a)} stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
              <path d={tp('M0 0.6L0 -0.75', x, y, r, a)} stroke={INK} strokeWidth="1" opacity=".35" strokeLinecap="round" />
            </g>
          ))}
          {pot(35, 62, 36, 28, G.terra, pc)}
        </g>
      );
    },
  },
  succulents: {
    name: 'Succulent trio', w: 64, h: 36, where: 'shelf', set: ['plant', 'minimal', 'boho'], pots: true,
    art: ({ pot: pc } = {}) => (
      <g>
        {[-160, -20, -125, -55, -90].map((a) => <g key={a}>{leaf(11, 24, 0.5, a, '#9cc2a0')}</g>)}
        {[-120, -60, -90].map((a) => <g key={a}>{leaf(11, 23, 0.32, a, '#b9d8b8')}</g>)}
        <circle cx="32" cy="15" r="8" fill={G.leaf} {...O} />
        <path d="M28 8.5C26.5 12 26.5 18 28 22.5M32 7V23M36 8.5C37.5 12 37.5 18 36 22.5" stroke={INK} strokeWidth="1" opacity=".35" fill="none" />
        <circle cx="29" cy="12" r="1.6" {...HL} />
        {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={32 + 2.2 * Math.cos((a * Math.PI) / 180)} cy={6 + 2.2 * Math.sin((a * Math.PI) / 180)} r="1.7" fill={G.pink} stroke={INK} strokeWidth=".8" />)}
        <circle cx="32" cy="6" r="1.1" fill="#f3d98a" />
        {[-125, -55, -105, -75].map((a) => <g key={a}>{leaf(53, 25, 0.6, a, '#86b06f')}</g>)}
        {pot(11, 24, 16, 12, '#e9dcc6', pc)}
        {pot(32, 22, 18, 14, G.pink, pc)}
        {pot(53, 24, 16, 12, '#a9b89a', pc)}
      </g>
    ),
  },
  cactus: {
    name: 'Cactus', w: 40, h: 66, where: 'shelf', set: ['plant', 'boho'], pots: true,
    art: ({ pot: pc } = {}) => (
      <g>
        <path d="M15 37H9C6.5 37 5 35.5 5 33V24C5 20 11 20 11 24V31H15Z" fill={G.leaf} {...O} />
        <path d="M25 31H30V21C30 17 36 17 36 21V31C36 35 34 37 31 37H25Z" fill={G.leaf} {...O} />
        <path d="M14 48V16C14 8 26 8 26 16V48Z" fill={G.leaf} {...O} />
        <rect x="22.4" y="14" width="2.6" height="33" rx="1.3" {...SH} />
        <path d="M18 13V47M22 12V47" stroke={INK} strokeWidth="1" opacity=".3" />
        <path d="M16.2 20L15 19M16.2 30L15 29M16.2 40L15 39M20 24L21 23M20 36L21 35M24 18L25.2 17M24 30L25.2 29M7.5 27L6.5 26M33.5 24L34.5 23" stroke={INK} strokeWidth="1" strokeLinecap="round" />
        <rect x="16" y="14" width="1.6" height="9" rx=".8" {...HL} />
        {[0, 90, 180, 270].map((a) => <circle key={a} cx={20 + 2.6 * Math.cos((a * Math.PI) / 180)} cy={9 + 2.6 * Math.sin((a * Math.PI) / 180)} r="2.2" fill={G.pink} stroke={INK} strokeWidth="1" />)}
        <circle cx="20" cy="9" r="1.4" fill="#f3d98a" />
        {pot(20, 46, 28, 20, G.terra, pc)}
      </g>
    ),
  },
  pothos: {
    name: 'Trailing pothos', w: 70, h: 72, where: 'shelf', set: ['plant', 'cozy', 'boho', 'witchy'], pots: true,
    art: ({ pot: pc } = {}) => (
      <g>
        {/* propped on two books so the vines have room to trail */}
        <rect x="5" y="58" width="60" height="14" rx="2" fill="#7f9a8f" {...O} />
        <path d="M10 59.6V70.4M13 59.6V70.4M57 59.6V70.4M60 59.6V70.4" stroke={G.gold} strokeWidth="1" />
        <rect x="28" y="62" width="14" height="6" rx="1" fill="#fbf4ea" stroke={INK} strokeWidth=".9" />
        <rect x="7" y="59.3" width="22" height="1.2" rx=".6" fill="#fff" opacity=".3" />
        <rect x="9" y="48" width="52" height="10" rx="2" fill="#c98a6a" {...O} />
        <path d="M14 48.6V57.4M17 48.6V57.4M53 48.6V57.4" stroke={G.gold} strokeWidth="1" />
        <rect x="11" y="49.2" width="20" height="1.2" rx=".6" fill="#fff" opacity=".3" />
        {crown(35, 24, 0.95, 1.4)}
        {pot(35, 24, 34, 24, '#e9dcc6', pc)}
        {vine([[25, 23], [12, 18], [5, 42], [11, 61]], 5, 0.62)}
        {vine([[45, 23], [58, 19], [64, 40], [60, 54]], 4, 0.6, 1)}
        {vine([[38, 23], [41, 29], [32, 37], [37, 47]], 3, 0.55)}
      </g>
    ),
  },
  snakePlant: {
    name: 'Snake plant', w: 64, h: 140, where: 'floor', set: ['plant', 'minimal'], pots: true,
    art: ({ pot: pc } = {}) => {
      const L = [[22, 14, 30, 6], [44, 54, 46, 6], [18, 6, 56, 6], [40, 48, 22, 7], [28, 24, 6, 7], [34, 36, 14, 7]];
      const k = potSet(pc);
      return (
        <g>
          {L.map(([bx, tx, ty, w], i) => (
            <g key={i}>
              <path d={`M${bx - w} 102Q${bx - w * 0.7} ${(102 + ty) / 2} ${tx} ${ty}Q${bx + w * 0.9} ${(102 + ty) / 2} ${bx + w} 102Z`} fill={i % 2 ? '#4f7a4a' : '#5e8a52'} {...O} />
              {[0.25, 0.45, 0.65].map((f) => {
                const cx = bx + (tx - bx) * f * 0.8, cy = 102 + (ty - 102) * f, hw = w * (1 - f) * 0.6;
                return <path key={f} d={`M${cx - hw} ${cy}Q${cx} ${cy - 2.5} ${cx + hw} ${cy}`} stroke="#9cc283" strokeWidth="1.2" fill="none" strokeLinecap="round" />;
              })}
            </g>
          ))}
          <rect x="11" y="96" width="42" height="44" rx="6" fill={k ? k.body : '#f3eee6'} {...O} />
          <rect x="11.8" y="106" width="40.4" height="7" fill={k ? k.shade : G.terra} />
          <path d="M11 106H53M11 113H53" stroke={INK} strokeWidth="1.2" />
          <rect x="42" y="97" width="10" height="42" rx="4" {...(k ? { fill: k.shade, opacity: 0.55 } : SH)} />
          <rect x="15" y="117" width="3" height="16" rx="1.5" {...(k ? { fill: k.hl, opacity: 0.85 } : HL)} />
        </g>
      );
    },
  },
  fiddleFig: {
    name: 'Fiddle leaf fig', w: 96, h: 200, where: 'floor', set: ['plant', 'minimal', 'boho'], pots: true,
    art: ({ pot: pc } = {}) => {
      const FL = 'M0 0C-0.5 -0.4 -0.75 -0.9 -0.7 -1.3C-0.65 -1.8 -0.2 -2 0 -1.9C0.2 -2 0.65 -1.8 0.7 -1.3C0.75 -0.9 0.5 -0.4 0 0Z';
      const L = [[20, 96, 10, -100], [76, 92, 10, 100], [44, 114, 10, -130], [54, 106, 10, 125], [30, 88, 12, -55], [66, 74, 13, 40], [24, 70, 11, -75], [76, 58, 11, 65], [48, 72, 13, 0], [28, 48, 10, -45], [68, 50, 10, 40], [40, 54, 12, -20], [56, 60, 12, 20], [36, 40, 12, -10], [60, 40, 12, 15], [48, 30, 11, 0]];
      return (
        <g>
          {cord('M48 158C47 130 50 110 48 72', '#8a6a4f', 4)}
          {cord('M48 112Q36 102 30 88M48 96Q60 86 66 74M48 84Q42 70 40 56M48 104Q66 104 76 92', '#8a6a4f', 2)}
          {L.map(([x, y, s, a], i) => (
            <g key={i}>
              <path d={tp(FL, x, y, s, a)} fill={i % 3 === 1 ? '#86b06f' : i % 3 ? '#6f9a5c' : G.dark} {...O} />
              <path d={tp('M0 -0.1L0 -1.7', x, y, s, a)} stroke={INK} strokeWidth="1" opacity=".3" strokeLinecap="round" />
            </g>
          ))}
          {pot(48, 156, 52, 44, '#e9dcc6', pc)}
          <path d="M26 176H70M28 186H68" stroke={pc ? mix(pc, '#000000', 0.12) : '#c9b49a'} strokeWidth="1.4" strokeLinecap="round" />
        </g>
      );
    },
  },
  hangingPlant: {
    name: 'Hanging plant', w: 70, h: 150, where: 'wall', set: ['plant', 'boho'], pots: true,
    art: ({ pot: pc } = {}) => {
      const k = potSet(pc);
      return (
        <g>
          <circle cx="35" cy="5" r="3" fill="none" stroke="#8a7a62" strokeWidth="1.6" />
          {crown(35, 82, 0.95, 2)}
          {[[17, 84], [28, 87], [42, 87], [53, 84]].map(([x, y], i) => <g key={i}>{cord(`M35 14L${x} ${y}`, '#efe3cc', 1.4)}</g>)}
          {[[24.8, 48], [31.7, 50], [38.3, 50], [45.2, 48]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.3" fill={G.wood} {...O} strokeWidth="1.2" />)}
          <rect x="31.5" y="9" width="7" height="8" rx="3" fill="#efe3cc" {...O} />
          <path d="M15 84H55C55 100 46 108 35 108C24 108 15 100 15 84Z" fill={k ? k.body : G.terra} {...O} />
          <path d="M44 88H53C52 98 47 104 40 106C45 100 45 94 44 88Z" {...(k ? { fill: k.shade } : SH)} />
          <rect x="13" y="81" width="44" height="5" rx="2.5" fill={k ? k.rim : G.terra} {...O} />
          {k && <rect x="16" y="82.2" width="10" height="1.4" rx=".7" fill={k.hl} opacity=".85" />}
          {vine([[22, 80], [7, 74], [2, 108], [12, 141]], 6, 0.6)}
          {vine([[48, 80], [63, 74], [66, 104], [59, 128]], 5, 0.58, 1)}
          {vine([[36, 81], [39, 92], [30, 102], [35, 118]], 4, 0.55, 1)}
        </g>
      );
    },
  },
  sprout: {
    name: 'Sprout', w: 30, h: 36, where: 'shelf', set: ['plant', 'minimal', 'cozy'], pots: true,
    art: ({ pot: pc } = {}) => (
      <g>
        {cord('M15 24C15 19 15 15 15 11', '#6f9a5c', 1.4)}
        {leaf(15, 11, 0.6, -155, '#86b06f')}
        {leaf(15, 11, 0.6, -25, G.leaf)}
        {pot(15, 22, 18, 14, G.terra, pc)}
      </g>
    ),
  },

  wateringCan: {
    name: 'Watering can', w: 58, h: 40, where: 'shelf', set: ['plant', 'cozy'],
    art: () => (
      <g>
        {cord('M27 17C26 4 45 3.5 47 18', '#8fb0a6', 2.8)}
        <path d="M24 33L10.5 16.5L8 18.5L22 36Z" fill="#9cb8b0" {...O} />
        <path d="M11.4 15.6L6 11L3 14.6L8.4 19.6Z" fill="#b2cbc3" {...O} strokeWidth="1.3" />
        <path d="M5.4 12.6L4.6 13.6M6.4 14.4L5.6 15.4M7.4 16.2L6.6 17.2" stroke={INK} strokeWidth="1" strokeLinecap="round" />
        {[[3.2, 21], [6.4, 24.4], [2.6, 27]].map(([x, y]) => <path key={y} d={tp('M0 -2.4C1.5 -0.6 1.7 1.5 0 1.7C-1.7 1.5 -1.5 -0.6 0 -2.4Z', x, y)} fill="#a9cde0" stroke={INK} strokeWidth=".8" strokeLinejoin="round" />)}
        <path d="M22 17H48L50 36.5Q50 40 46.5 40H23.5Q20 40 20 36.5Z" fill="#9cb8b0" {...O} />
        <path d="M42 18.5H48.4L50 36.4Q50 39 46.8 39H41C43.5 33 43.6 25 42 18.5Z" {...SH} />
        <path d="M21.2 27H49" stroke="#7f9a92" strokeWidth="1.3" />
        {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={32 + 2 * Math.cos((a * Math.PI) / 180)} cy={33 + 2 * Math.sin((a * Math.PI) / 180)} r="1.6" fill="#fffaf1" stroke={INK} strokeWidth=".7" />)}
        <circle cx="32" cy="33" r="1" fill="#f3d98a" />
        <rect x="20" y="14.5" width="30" height="4.4" rx="2.2" fill="#b2cbc3" {...O} />
        <rect x="23" y="21" width="1.8" height="12" rx=".9" {...HL} />
      </g>
    ),
  },
  terrarium: {
    name: 'Terrarium', w: 48, h: 46, where: 'shelf', set: ['plant', 'minimal'],
    art: () => {
      const B = 'M12 13C3 20 2 37 10 43Q14 46 24 46Q34 46 38 43C46 37 45 20 36 13Z';
      return (
        <g>
          <defs><clipPath id="terrarium-glass"><path d={B} /></clipPath></defs>
          <path d={B} fill="#e6f1ee" />
          <g clipPath="url(#terrarium-glass)">
            <rect x="0" y="38" width="48" height="9" fill="#c9c2b4" />
            {[[8, 41], [14, 43.5], [21, 40.5], [28, 43], [35, 41], [40, 43]].map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="2" ry="1.3" fill="#e3ddd2" stroke={INK} strokeWidth=".7" />)}
            <path d="M0 33C10 31.5 36 31.5 48 34V38.5H0Z" fill="#8a6a4f" />
            <path d="M0 33C5 29.5 9 32 13 30.5C17 29 21 31.5 25 30.5C30 29 35 31.5 48 31V34.5C36 32.5 10 32.5 0 34Z" fill={G.leaf} />
            <path d="M0 38.5H48" stroke={INK} strokeWidth=".8" opacity=".4" />
          </g>
          {[-150, -30, -120, -60, -90].map((a) => <ellipse key={a} cx={15 + 3.6 * Math.cos((a * Math.PI) / 180)} cy={29.5 + 3.6 * Math.sin((a * Math.PI) / 180)} rx="3.4" ry="1.9" transform={`rotate(${a} ${15 + 3.6 * Math.cos((a * Math.PI) / 180)} ${29.5 + 3.6 * Math.sin((a * Math.PI) / 180)})`} fill={a === -90 ? '#b9d8b8' : '#9cc2a0'} stroke={INK} strokeWidth="1" />)}
          <circle cx="15" cy="28.6" r="1.4" fill="#b9d8b8" stroke={INK} strokeWidth=".8" />
          {cord('M27 31C27 25 28.5 20 31.5 16', '#6f9a5c', 0.9)}
          {[[27.4, 27], [28, 23.4], [29.4, 20], [31, 17.2]].map(([x, y], i) => (
            <g key={y}>
              <ellipse cx={x - 2.4} cy={y - 0.6} rx="2.2" ry="1.2" transform={`rotate(${-25 - i * 6} ${x - 2.4} ${y - 0.6})`} fill={G.light} stroke={INK} strokeWidth=".8" />
              <ellipse cx={x + 2.4} cy={y - 0.8} rx="2.2" ry="1.2" transform={`rotate(${25 - i * 6} ${x + 2.4} ${y - 0.8})`} fill={G.leaf} stroke={INK} strokeWidth=".8" />
            </g>
          ))}
          <rect x="35.4" y="27" width="2.2" height="4.6" rx="1" fill="#f6ead4" stroke={INK} strokeWidth=".8" />
          <path d="M33 28C33 23.6 40 23.6 40 28Z" fill="#d9604a" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <circle cx="35.4" cy="26.2" r=".7" fill="#fffaf1" />
          <path d={B} fill="none" {...O} />
          <ellipse cx="24" cy="13" rx="12" ry="3" fill="none" {...O} />
          <path d="M8 24C8 20 9.6 17.4 12 15.6M40 30C40.4 34 39.6 37 38 39" stroke="#fff" strokeWidth="1.6" opacity=".75" fill="none" strokeLinecap="round" />
        </g>
      );
    },
  },
  propagation: {
    name: 'Propagation jars', w: 64, h: 56, where: 'shelf', set: ['plant', 'minimal', 'boho'],
    art: () => {
      const J = [[18, [15, 9], -125, 0.62], [32, [33, 5], -72, 0.64], [46, [49, 11], -50, 0.6]];
      const hw = Math.sqrt(7.5 * 7.5 - 4);
      return (
        <g transform="translate(0 4)">
          <rect x="4" y="16" width="4" height="32" rx="1.5" fill={G.wood} {...O} />
          <rect x="56" y="16" width="4" height="32" rx="1.5" fill={G.wood} {...O} />
          {J.map(([cx, [tx, ty], a, s], i) => (
            <g key={cx}>
              {cord(`M${cx} 40C${cx} 28 ${tx} ${ty + 14} ${tx} ${ty}`, '#6f9a5c', 1)}
              {pleaf(tx, ty, s, a, VINE[i])}
              {pleaf(cx + (tx - cx) * 0.6, ty + 11, s * 0.8, i === 1 ? -150 : a + (i ? 60 : -50), VINE[(i + 1) % 3])}
              <rect x={cx - 3} y="20" width="6" height="14" fill="#e6f1ee" fillOpacity=".7" {...O} strokeWidth="1.3" />
              <circle cx={cx} cy="38" r="7.5" fill="#e6f1ee" />
              <path d={`M${cx - hw} 36A7.5 7.5 0 1 0 ${cx + hw} 36Z`} fill="#cfe3ec" />
              <path d={`M${cx} 34V40M${cx} 39C${cx - 1} 41 ${cx - 3.5} 41.5 ${cx - 3} 44M${cx} 39.5C${cx + 1.5} 41 ${cx + 1} 43 ${cx + 3} 44.4M${cx} 40C${cx} 42 ${cx + 0.5} 43.5 ${cx - 0.4} 45`} stroke="#d9c8a8" strokeWidth="1.1" fill="none" strokeLinecap="round" />
              <circle cx={cx} cy="38" r="7.5" fill="none" {...O} />
              <path d={`M${cx - 4.6} 36C${cx - 4.4} 34.4 ${cx - 3.4} 33.2 ${cx - 2} 32.6`} stroke="#fff" strokeWidth="1.3" opacity=".8" fill="none" strokeLinecap="round" />
            </g>
          ))}
          <rect x="2" y="22" width="60" height="5" rx="2" fill={G.wood} {...O} />
          <rect x="2" y="45" width="60" height="7" rx="2.5" fill={G.wood} {...O} />
          <rect x="5" y="46.2" width="18" height="1.3" rx=".65" {...HL} />
          <path d="M8 49.6H40" stroke="#8a6a4f" strokeWidth=".9" strokeLinecap="round" />
        </g>
      );
    },
  },
  mister: {
    name: 'Plant mister', w: 28, h: 46, where: 'shelf', set: ['plant'],
    art: () => {
      const B = 'M5 24Q5 20 9 19H17Q21 20 21 24V43Q21 46 18 46H8Q5 46 5 43Z';
      return (
        <g>
          {[[23.5, 3.5, 0.9], [25.5, 6.5, 0.7], [25.8, 1.8, 0.6], [22.8, 7.6, 0.5]].map(([x, y, r]) => <circle key={x + '' + y} cx={x} cy={y} r={r} fill="#a9cde0" />)}
          <rect x="10" y="13" width="6" height="7" fill="#c9e0d6" {...O} />
          <path d={B} fill="#c9e0d6" />
          <path d="M5.8 31H20.2V43Q20.2 45.2 18 45.2H8Q5.8 45.2 5.8 43Z" fill="#a9cdbf" />
          <path d="M15.5 21H20Q20.4 22 20.4 24V43Q20.4 45 18.4 45.4H15.5C17 38 17 28 15.5 21Z" {...SH} />
          <path d={B} fill="none" {...O} />
          <path d="M7.8 24V40" stroke="#fff" strokeWidth="1.5" opacity=".75" strokeLinecap="round" />
          <rect x="12" y="4.5" width="2" height="7" fill="#b8933f" {...O} strokeWidth="1.1" />
          <rect x="8.5" y="10.5" width="9" height="4" rx="1.5" fill={G.gold} {...O} />
          <rect x="8.5" y="1.5" width="9.5" height="4.4" rx="1.6" fill={G.gold} {...O} />
          <rect x="17.6" y="2.6" width="3.4" height="2.2" rx=".8" fill="#b8933f" {...O} strokeWidth="1" />
          <rect x="9.8" y="2.4" width="3.6" height="1.1" rx=".55" {...HL} />
        </g>
      );
    },
  },
  rubberPlant: {
    name: 'Rubber plant', w: 84, h: 170, where: 'floor', set: ['plant', 'minimal'], pots: true,
    art: ({ pot: pc } = {}) => {
      const RL = 'M0 0C2 -6 10 -9 18 -7.4C24 -6 27.5 -2.4 28.5 0C27.5 2.4 24 6 18 7.4C10 9 2 6 0 0Z';
      const L = [[112, -162, 1], [102, -18, 1.02], [90, -146, 1.04], [79, -34, 1], [67, -132, 0.96], [56, -48, 0.92], [45, -118, 0.82], [36, -64, 0.72]];
      const sx = (y) => 42 + Math.sin(y / 18) * 1.5;
      return (
        <g>
          {cord('M42 130C41 104 44 72 42 26', '#6b5a3a', 3)}
          {L.map(([y, a], i) => {
            const r = (a * Math.PI) / 180, x0 = sx(y), bx = x0 + Math.cos(r) * 4, by = y + Math.sin(r) * 4;
            return <g key={'p' + i}>{cord(`M${x0} ${y}L${bx} ${by}`, '#7a5a3a', 1.4)}</g>;
          })}
          {L.map(([y, a, s], i) => {
            const r = (a * Math.PI) / 180, bx = sx(y) + Math.cos(r) * 4, by = y + Math.sin(r) * 4;
            return (
              <g key={i}>
                <path d={tp(RL, bx, by, s, a)} fill={i % 2 ? '#4d7048' : '#3f5f3e'} {...O} />
                <path d={tp('M1.5 0Q14 -0.6 26 0', bx, by, s, a)} stroke="#d98a7a" strokeWidth="1.2" opacity=".75" fill="none" strokeLinecap="round" />
                <path d={tp('M8 -4.6Q14 -6.4 20 -5', bx, by, s, a)} stroke="#fff" strokeWidth="1.4" opacity=".35" fill="none" strokeLinecap="round" />
              </g>
            );
          })}
          <path d="M42 28C39.6 21 40.6 13 43 6C45.2 13 45.6 21 42 28Z" fill="#c9605a" {...O} />
          <path d="M42.4 10.5Q43.2 16 42.6 22" stroke="#fff" strokeWidth="1.1" opacity=".4" fill="none" strokeLinecap="round" />
          {pot(42, 124, 52, 46, G.terra, pc)}
        </g>
      );
    },
  },
  stringOfPearls: {
    name: 'String of pearls', w: 64, h: 140, where: 'wall', set: ['plant', 'boho'], pots: true,
    art: ({ pot: pc } = {}) => {
      const k = potSet(pc);
      const S = [
        [[19, 54], [7, 50], [4, 84], [9, 124]],
        [[25, 55], [20, 63], [13, 94], [19, 135]],
        [[32, 56], [35, 67], [28, 88], [31, 106]],
        [[39, 55], [44, 64], [51, 94], [45, 128]],
        [[45, 54], [58, 50], [61, 84], [56, 112]],
      ];
      const beads = (p, si) => {
        const n = Math.round((p[3][1] - p[0][1]) / 4.6);
        return Array.from({ length: n }, (_, i) => {
          const t = 0.06 + (0.94 * i) / (n - 1), [x, y] = cub(p, t), a = ((cubAng(p, t) + 90) * Math.PI) / 180, o = i % 2 ? 1.3 : -1.3;
          const cx = x + Math.cos(a) * o, cy = y + Math.sin(a) * o, r = i === n - 1 ? 1.6 : 2.1;
          return (
            <g key={si + '-' + i}>
              <circle cx={cx} cy={cy} r={r} fill={(i + si) % 3 ? '#8fbf6a' : '#a3cc7e'} stroke={INK} strokeWidth=".9" />
              <circle cx={cx - 0.6} cy={cy - 0.6} r=".55" fill="#fff" opacity=".6" />
            </g>
          );
        });
      };
      return (
        <g>
          <circle cx="32" cy="5" r="3" fill="none" stroke="#8a7a62" strokeWidth="1.6" />
          {Array.from({ length: 11 }, (_, i) => {
            const x = 18 + i * 2.8, y = 53 - Math.sin((i / 10) * Math.PI) * 6 + (i % 2) * 1.6;
            return <g key={'c' + i}><circle cx={x} cy={y} r="2.1" fill={i % 3 ? '#8fbf6a' : '#a3cc7e'} stroke={INK} strokeWidth=".9" /><circle cx={x - 0.6} cy={y - 0.6} r=".55" fill="#fff" opacity=".6" /></g>;
          })}
          {[[14, 57], [32, 60], [50, 57]].map(([x, y], i) => <g key={i}>{cord(`M32 14L${x} ${y}`, '#efe3cc', 1.3)}</g>)}
          <rect x="28.5" y="9" width="7" height="8" rx="3" fill="#efe3cc" {...O} />
          <path d="M13 58H51C51 72 43 78 32 78C21 78 13 72 13 58Z" fill={k ? k.body : '#e9dcc6'} {...O} />
          <path d="M41 61H50C49 70 45 75 38 77C42.5 72 42.5 66 41 61Z" {...(k ? { fill: k.shade } : SH)} />
          <path d="M14.4 65.5Q32 69 49.6 65.5" stroke={k ? k.shade : G.terra} strokeWidth="1.6" fill="none" strokeDasharray="2.4 2.4" strokeLinecap="round" />
          <rect x="11" y="55" width="42" height="5" rx="2.5" fill={k ? k.rim : '#e9dcc6'} {...O} />
          <rect x="14" y="56.2" width="10" height="1.4" rx=".7" {...(k ? { fill: k.hl, opacity: 0.85 } : HL)} />
          {S.map((p, i) => <g key={i}>{cord(`M${p[0]}C${p[1]} ${p[2]} ${p[3]}`, '#6f9a5c', 0.7)}</g>)}
          {S.map((p, i) => <g key={'b' + i}>{beads(p, i)}</g>)}
        </g>
      );
    },
  },

  // ---------- Witchy / dark academia ----------
  candles: {
    name: 'Candles', w: 58, h: 60, where: 'shelf', set: ['witchy', 'cozy', 'coquette'], wax: true,
    art: ({ wax } = {}) => (
      <g>
        {[[4, 14, 30, '#f1e4cc'], [21, 16, 20, '#f3e9d6'], [40, 14, 38, '#efe0c4']].map(([x, w, top, c], i) => {
          const k = waxSet(wax && mix(wax, '#ffffff', i === 1 ? 0.1 : 0));
          return (
          <g key={x}>
            <rect x={x} y={top} width={w} height={60 - top} rx="2.5" fill={k ? k.body : c} {...O} />
            <rect x={x + w * 0.66} y={top + 1} width={w * 0.3} height={58 - top} rx="1.5" {...(k ? { fill: k.shade } : SH)} />
            <path d={`M${x + 1} ${top + 2}H${x + w - 1}V${top + 4}C${x + w - 3} ${top + 6} ${x + w * 0.62} ${top + 4} ${x + w * 0.55} ${top + 5}V${top + 11}C${x + w * 0.55} ${top + 13} ${x + w * 0.38} ${top + 13} ${x + w * 0.38} ${top + 11}V${top + 5.5}C${x + 3} ${top + 6} ${x + 1} ${top + 5} ${x + 1} ${top + 4}Z`} fill={k ? k.drip : '#fffaf1'} />
            {k && <rect x={x + 2.2} y={top + 14} width="1.6" height={Math.max(4, 40 - top)} rx=".8" fill={k.hl} opacity=".8" />}
            <path d={`M${x + w / 2} ${top}V${top - 3}`} stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
            {flame(x + w / 2, top - 3)}
          </g>
          );
        })}
      </g>
    ),
  },
  crystal: {
    name: 'Crystal cluster', w: 50, h: 46, where: 'shelf', set: ['witchy', 'boho'],
    art: () => (
      <g>
        {[[17, 10, 24, -4, '#8c69a0'], [34, 10, 26, 4, '#8c69a0'], [25, 13, 38, 0, '#a985c0'], [10, 8, 15, -5, '#b597cc'], [40, 8, 14, 5, '#b597cc']].map(([bx, w, h, t, c], i) => {
          const x0 = bx - w / 2, x1 = bx + w / 2, ys = 42 - h + w * 0.6, yt = 42 - h;
          return (
            <g key={i}>
              <path d={`M${x0} 42L${x0 + t} ${ys}L${bx + t} ${yt}L${x1 + t} ${ys}L${x1} 42Z`} fill={c} {...O} />
              <path d={`M${x0 + 0.8} 42L${x0 + t + 0.8} ${ys}L${bx + t} ${yt + 1}L${bx + t * 0.4} ${ys + 1}L${bx - 1} 42Z`} fill="#fff" opacity=".22" />
              <path d={`M${bx + t} ${yt}L${bx + t * 0.4} ${ys + 1}L${bx} 42`} stroke={INK} strokeWidth="1" opacity=".35" fill="none" />
              <path d={`M${x0 + t + 2} ${ys + 2}L${x0 + 2.2} ${ys + (42 - ys) * 0.55}`} stroke="#fff" strokeWidth="1.3" opacity=".6" strokeLinecap="round" />
            </g>
          );
        })}
        <path d="M3 46C3 39 11 36 18 37C21 34 30 34 33 37C40 36 47 39 47 46Z" fill="#8b8296" {...O} />
        <path d="M33 39C40 38.5 45 41 45.5 45H36C37 43 36 40.5 33 39Z" {...SH} />
      </g>
    ),
  },
  skull: {
    name: 'Skull', w: 40, h: 40, where: 'shelf', set: ['witchy'],
    art: () => (
      <g>
        <rect x="12" y="25" width="16" height="14.4" rx="4" fill="#efe6d2" {...O} />
        <circle cx="20" cy="18" r="15" fill="#efe6d2" {...O} />
        <path d="M30 7C36 14 35 25 28 31C31 24 32 15 30 7Z" {...SH} />
        <path d="M16 33.5V38.6M20 33.5V38.8M24 33.5V38.6" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="13.6" cy="20" rx="4.3" ry="4.7" fill={INK} />
        <ellipse cx="26.4" cy="20" rx="4.3" ry="4.7" fill={INK} />
        <circle cx="12.4" cy="18.6" r="1.1" fill="#fff" opacity=".7" />
        <circle cx="25.2" cy="18.6" r="1.1" fill="#fff" opacity=".7" />
        <path d="M20 25L18.4 28.6H21.6Z" fill={INK} {...O} strokeWidth="1" />
        <ellipse cx="13" cy="9.5" rx="3.4" ry="2" transform="rotate(-25 13 9.5)" {...HL} />
      </g>
    ),
  },
  potions: {
    name: 'Potion bottles', w: 58, h: 54, where: 'shelf', set: ['witchy'],
    art: () => {
      const hw = Math.sqrt(121 - 1);
      return (
        <g>
          <rect x="11" y="22" width="6" height="12" fill="#dfeee8" {...O} />
          <circle cx="14" cy="43" r="11" fill="#dfeee8" />
          <path d={`M${14 - hw} 42A11 11 0 1 0 ${14 + hw} 42Z`} fill="#86c79a" />
          <circle cx="14" cy="43" r="11" fill="none" {...O} />
          <rect x="10" y="20.5" width="8" height="3" rx="1.5" fill="#dfeee8" {...O} />
          <rect x="10.8" y="15.5" width="6.4" height="5.5" rx="1.5" fill="#b98a5e" {...O} />
          <path d="M7 38C7.5 35.5 9 34 11 33" stroke="#fff" strokeWidth="1.6" opacity=".8" fill="none" strokeLinecap="round" />
          <circle cx="19" cy="46" r="1.2" fill="#fff" opacity=".6" />
          <circle cx="16" cy="49" r=".8" fill="#fff" opacity=".6" />

          <path d="M27 54V24Q27 19 31 18V11H35V18Q39 19 39 24V54Z" fill="#e8e0f0" />
          <rect x="27.8" y="30" width="10.4" height="23.2" fill={G.purple} />
          <path d="M27 54V24Q27 19 31 18V11H35V18Q39 19 39 24V54Z" fill="none" {...O} />
          <rect x="30" y="5.5" width="6" height="6" rx="1.5" fill="#8a6a4f" {...O} />
          <path d={tp('M0 -3.2L0.9 -0.9L3.2 0L0.9 0.9L0 3.2L-0.9 0.9L-3.2 0L-0.9 -0.9Z', 33, 41)} fill="#f3d98a" stroke={INK} strokeWidth=".8" strokeLinejoin="round" />
          <path d="M29.5 26V50" stroke="#fff" strokeWidth="1.4" opacity=".6" strokeLinecap="round" />

          <path d="M42 54L47 38V32H51V38L56 54Z" fill="#f6e6ea" />
          <path d="M43.5 53.2L45.6 46H52.4L54.5 53.2Z" fill="#e8a0b0" />
          <path d="M42 54L47 38V32H51V38L56 54Z" fill="none" {...O} />
          <rect x="46.4" y="27.6" width="5.2" height="5" rx="1.4" fill="#b98a5e" {...O} />
          <path d="M46 42L44.6 47" stroke="#fff" strokeWidth="1.3" opacity=".7" strokeLinecap="round" />
        </g>
      );
    },
  },
  cauldron: {
    name: 'Cauldron', w: 50, h: 44, where: 'shelf', set: ['witchy'],
    art: () => (
      <g>
        <rect x="11" y="35" width="5" height="9" rx="2" fill="#2f2a2a" {...O} />
        <rect x="34" y="35" width="5" height="9" rx="2" fill="#2f2a2a" {...O} />
        <path d="M5 16C1 30 10 41 25 41C40 41 49 30 45 16Z" fill="#3a3633" {...O} />
        <path d="M36 19C40 26 37 34 30 38C38 37 44 30 43 19Z" fill="#000" opacity=".25" />
        <path d="M9 22C9 28 12 33 16 35" stroke="#fff" strokeWidth="1.8" opacity=".35" fill="none" strokeLinecap="round" />
        <ellipse cx="25" cy="15.5" rx="21.5" ry="5" fill="#4a4542" {...O} />
        <ellipse cx="25" cy="15.5" rx="17" ry="3" fill="#8fd16a" {...O} strokeWidth="1.2" />
        <ellipse cx="20" cy="15" rx="5" ry="1" fill="#c6f0a4" opacity=".7" />
        <circle cx="19" cy="9" r="2.6" fill="#a8e07f" {...O} strokeWidth="1.2" />
        <circle cx="28" cy="5" r="2" fill="#a8e07f" {...O} strokeWidth="1.2" />
        <circle cx="33" cy="10" r="1.5" fill="#a8e07f" {...O} strokeWidth="1.1" />
        <circle cx="18.3" cy="8.2" r=".8" fill="#fff" opacity=".7" />
      </g>
    ),
  },
  blackCat: {
    name: 'Black cat', w: 50, h: 60, where: 'shelf', set: ['witchy', 'cozy'],
    art: () => (
      <g>
        {cord('M34 57C47 57 50 46 44 38', '#2f2a30', 5)}
        <path d="M10 60C5 46 12 30 22 30C34 30 41 46 36 60Z" fill="#2f2a30" {...O} />
        <ellipse cx="17" cy="58.4" rx="4" ry="2" fill="#3b353d" {...O} strokeWidth="1.2" />
        <ellipse cx="28" cy="58.4" rx="4" ry="2" fill="#3b353d" {...O} strokeWidth="1.2" />
        <path d="M11 17L12.5 4L20.5 11Z" fill="#2f2a30" {...O} />
        <path d="M26.5 11L34 4L35.5 17Z" fill="#2f2a30" {...O} />
        <path d="M13.2 13L13.8 7.5L17.4 10.6Z" fill="#c98a96" />
        <path d="M29.8 10.6L33.2 7.5L33.6 13Z" fill="#c98a96" />
        <circle cx="23" cy="22" r="13" fill="#2f2a30" {...O} />
        <ellipse cx="16" cy="15" rx="3.5" ry="2" transform="rotate(-30 16 15)" fill="#fff" opacity=".14" />
        <ellipse cx="17.5" cy="22" rx="3.2" ry="3.7" fill="#f3c94a" />
        <ellipse cx="28.5" cy="22" rx="3.2" ry="3.7" fill="#f3c94a" />
        <ellipse cx="17.5" cy="22.3" rx="1" ry="2.7" fill="#1f1b1d" />
        <ellipse cx="28.5" cy="22.3" rx="1" ry="2.7" fill="#1f1b1d" />
        <circle cx="16.6" cy="20.6" r=".8" fill="#fff" />
        <circle cx="27.6" cy="20.6" r=".8" fill="#fff" />
        <path d="M21.8 26.4H24.2L23 27.8Z" fill="#e8a0b0" />
        <path d="M23 27.8Q21.6 29.6 20.4 28.6M23 27.8Q24.4 29.6 25.6 28.6" stroke="#6b6070" strokeWidth=".9" fill="none" strokeLinecap="round" />
        <path d="M14 26L6 25M14 28L7 29.5M32 26L40 25M32 28L39 29.5" stroke="#8a8090" strokeWidth=".8" strokeLinecap="round" />
      </g>
    ),
  },
  moonGarland: {
    name: 'Moon garland', w: 220, h: 50, where: 'wall', set: ['witchy', 'boho'],
    art: () => {
      const A = [4, 6], B = [110, 30], C = [216, 6];
      const M = [[0, 0], [1, 0], [2, 0], [3, 0], [2, 1], [1, 1], [0, 1]];
      return (
        <g>
          <path d="M4 6Q110 30 216 6" stroke="#8a7a62" strokeWidth="1.2" fill="none" />
          {nail(4, 6)}
          {nail(216, 6)}
          {M.map(([p, f], i) => {
            const [x, y] = qpt(A, B, C, 0.1 + i * 0.1333);
            return (
              <g key={i}>
                <path d={`M${x} ${y}V${y + 6}`} stroke="#8a7a62" strokeWidth="1" />
                {moon(x, y + 15, 9, p, f)}
              </g>
            );
          })}
          {[0.166, 0.433, 0.566, 0.833].map((t) => {
            const [x, y] = qpt(A, B, C, t);
            return <path key={t} d={tp('M0 -3L0.8 -0.8L3 0L0.8 0.8L0 3L-0.8 0.8L-3 0L-0.8 -0.8Z', x, y + 3)} fill={G.gold} stroke={INK} strokeWidth=".8" strokeLinejoin="round" />;
          })}
        </g>
      );
    },
  },
  globe: {
    name: 'Globe', w: 44, h: 60, where: 'shelf', set: ['witchy', 'cozy'],
    art: () => (
      <g>
        <rect x="20" y="42" width="4" height="13" fill={G.wood} {...O} />
        <path d="M9 60H35Q35 55 28 54H16Q9 55 9 60Z" fill={G.wood} {...O} />
        <circle cx="22" cy="24" r="16" fill="#8fb3c9" {...O} />
        <path d="M14 13C18 9 25 11 23.5 16.5C22.5 20.5 17.5 19.5 16.5 24C15.5 28 11 26.5 9.5 22.5C8.5 18.5 10.5 15.5 14 13Z" fill={G.light} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
        <path d="M27 25.5C31 23.5 35 27 33.5 31.5C32 35.5 28 37 26 34C24.5 31 24.5 27.5 27 25.5Z" fill={G.light} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
        <path d="M30 11C37 17 37 31 30 37C35 30 35 18 30 11Z" {...SH} />
        <path d="M12 17C13 13 16 11 19 10" stroke="#fff" strokeWidth="1.6" opacity=".6" fill="none" strokeLinecap="round" />
        {cord('M22 5A19 19 0 0 0 22 43', G.gold, 2.4)}
        <circle cx="22" cy="5.5" r="2" fill={G.gold} {...O} strokeWidth="1.2" />
        <circle cx="22" cy="42.5" r="2" fill={G.gold} {...O} strokeWidth="1.2" />
      </g>
    ),
  },
  tarot: {
    name: 'Tarot card', w: 36, h: 52, where: 'shelf', set: ['witchy', 'boho'],
    art: () => (
      <g>
        <g transform="rotate(-7 20 50)">
          <rect x="8" y="6" width="25" height="42" rx="2.5" fill="#3f4a5c" {...O} />
          <rect x="10.5" y="8.5" width="20" height="37" rx="1.5" fill="none" stroke={G.gold} strokeWidth=".9" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const t = (a * Math.PI) / 180;
            return <path key={a} d={`M${20.5 + 5.4 * Math.cos(t)} ${18 + 5.4 * Math.sin(t)}L${20.5 + 7.4 * Math.cos(t)} ${18 + 7.4 * Math.sin(t)}`} stroke={G.gold} strokeWidth="1.1" strokeLinecap="round" />;
          })}
          <circle cx="20.5" cy="18" r="3.8" fill="#f3d98a" stroke={INK} strokeWidth="1" />
          <path d="M22.5 29A5 5 0 1 0 22.5 38A3.8 3.8 0 1 1 22.5 29Z" fill="#f3d98a" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <circle cx="14" cy="40" r=".9" fill={G.gold} />
          <circle cx="27" cy="27" r=".8" fill={G.gold} />
          <circle cx="13.5" cy="27" r=".7" fill={G.gold} />
          <circle cx="27.5" cy="41" r=".9" fill={G.gold} />
        </g>
        <rect x="2" y="46" width="32" height="6" rx="2" fill="#8a6a4f" {...O} />
        <rect x="4" y="47.5" width="10" height="1.4" rx=".7" {...HL} />
      </g>
    ),
  },
  oldBooks: {
    name: 'Old books', w: 60, h: 34, where: 'shelf', set: ['witchy', 'cozy'],
    art: () => (
      <g>
        {[[2, 23, 56, 11, '#6b2f35'], [6, 13, 48, 10, '#2f4a3a'], [4, 3, 46, 10, '#2b3550']].map(([x, y, w, h, c], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="2" fill={c} {...O} />
            {i === 1 && <rect x={x + w - 6} y={y + 1.5} width="5" height={h - 3} rx="1" fill="#efe3c8" />}
            {i === 1 && <path d={`M${x + w - 5.5} ${y + 3.8}H${x + w - 1.5}M${x + w - 5.5} ${y + 5.8}H${x + w - 1.5}M${x + w - 5.5} ${y + 7.8}H${x + w - 1.5}`} stroke="#c9b49a" strokeWidth=".7" />}
            <path d={`M${x + 5} ${y + 1.5}V${y + h - 1.5}M${x + 7.5} ${y + 1.5}V${y + h - 1.5}M${x + w - (i === 1 ? 10 : 7.5)} ${y + 1.5}V${y + h - 1.5}`} stroke={G.gold} strokeWidth="1" />
            <rect x={x + w / 2 - 7} y={y + h / 2 - 2} width="14" height="4" rx="1" fill="none" stroke={G.gold} strokeWidth=".9" />
            <rect x={x + 2} y={y + 1.2} width={w * 0.5} height="1.2" rx=".6" fill="#fff" opacity=".22" />
          </g>
        ))}
      </g>
    ),
  },

  crystalBall: {
    name: 'Crystal ball', w: 40, h: 50, where: 'shelf', set: ['witchy', 'boho'],
    art: () => (
      <g>
        <path d="M5 50H35Q35 44.5 29 43H11Q5 44.5 5 50Z" fill="#5e4636" {...O} />
        <path d="M6.4 47.4H33.6" stroke={G.gold} strokeWidth="1.2" />
        <circle cx="20" cy="21" r="15" fill="#cdbde8" {...O} />
        <path d="M8.5 23C11.5 18 17 26 22 21C26 17 30 20 31.5 23" stroke="#efe6fa" strokeWidth="3" opacity=".85" fill="none" strokeLinecap="round" />
        <path d="M12 29C15 27 19 30 23 28C26 26.5 28 27.5 29 28.5" stroke="#b39fd6" strokeWidth="2" opacity=".8" fill="none" strokeLinecap="round" />
        <path d="M28 10C34 16 34 28 27 33C31 26 31 16 28 10Z" {...SH} />
        <path d="M10 16C11 12 14 9 18 8" stroke="#fff" strokeWidth="2" opacity=".75" fill="none" strokeLinecap="round" />
        <circle cx="11" cy="20.5" r="1.1" fill="#fff" opacity=".75" />
        {[[24, 13, 1], [15, 33, 0.7], [29, 25, 0.6]].map(([x, y, s]) => <path key={x} d={tp('M0 -3L0.8 -0.8L3 0L0.8 0.8L0 3L-0.8 0.8L-3 0L-0.8 -0.8Z', x, y, s)} fill="#fffaf1" />)}
        <path d="M8 33C11 38.5 29 38.5 32 33L30 43.5H10Z" fill={G.gold} {...O} />
        <path d="M10.6 38.6Q20 41.6 29.4 38.6" stroke="#b8933f" strokeWidth="1.1" fill="none" />
        <path d="M11 35.4L12 38" stroke="#fff" strokeWidth="1.2" opacity=".55" strokeLinecap="round" />
      </g>
    ),
  },
  raven: {
    name: 'Raven', w: 46, h: 50, where: 'shelf', set: ['witchy'],
    art: () => (
      <g>
        <rect x="5" y="41" width="36" height="9" rx="4.5" fill={G.wood} {...O} />
        <ellipse cx="40" cy="45.5" rx="2.6" ry="3.6" fill="#c99a6a" {...O} strokeWidth="1.2" />
        <path d="M9 44.5H30M12 47H24" stroke="#8a6a4f" strokeWidth="1" strokeLinecap="round" />
        <path d="M29 33L43 42.5L41.5 44.5L38 43.5L37.5 45.5L27 38Z" fill="#2a2530" {...O} />
        <path d="M11 22C9 32 15 40 25 40C33 40 35.5 32 32 24C29 17 15 14.5 11 22Z" fill="#2f2a35" {...O} />
        <path d="M17 22C21 17 31 19 34 28C35.5 34 31 39.5 25 38.5C20.5 34 18 28 17 22Z" fill="#3e3848" {...O} />
        <path d="M22 26C25 28 28 32 29 36M25 23.5C28 26 31 29.5 32 33" stroke="#5d5470" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <circle cx="15" cy="15" r="8" fill="#2f2a35" {...O} />
        <path d="M9.4 12.2L1.8 15.6L9.6 18.2Z" fill="#4a4550" {...O} />
        <path d="M2.8 15.5L9.4 15.2" stroke="#6b6575" strokeWidth=".9" strokeLinecap="round" />
        <circle cx="13.6" cy="13.4" r="2" fill="#f3c94a" stroke={INK} strokeWidth=".8" />
        <circle cx="13.4" cy="13.6" r=".9" fill="#1f1b1d" />
        <circle cx="13" cy="12.8" r=".5" fill="#fff" />
        <path d="M15 8.5C18 7.6 21 9 22 11.5M13 23.5C15 27 18 30 21 31.5" stroke="#8a7aa0" strokeWidth="1.3" opacity=".6" fill="none" strokeLinecap="round" />
        {cord('M20 39.5L19.2 42.5M25.5 39.5L26.2 42.5', '#5a5560', 1.1)}
        <path d="M16.6 42.6H21.6M23.6 42.6H28.6" stroke="#5a5560" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    ),
  },
  mushroomJar: {
    name: 'Mushroom jar', w: 34, h: 50, where: 'shelf', set: ['witchy', 'plant', 'cozy'],
    art: () => {
      const J = 'M6 18Q6 14 10 14H24Q28 14 28 18V45Q28 50 23 50H11Q6 50 6 45Z';
      return (
        <g>
          <path d={J} fill="#e6f1ee" />
          <path d="M6.8 42C10 38.5 14.5 39.5 17 40.5C20 38.5 25 38.5 27.2 41V45Q27.2 49.2 23 49.2H11Q6.8 49.2 6.8 45Z" fill={G.leaf} />
          <path d="M9 44.5C10 43.5 11.5 43.5 12.5 44.5M19 45.5C20 44.5 21.5 44.5 22.5 45.5" stroke={G.dark} strokeWidth="1" fill="none" strokeLinecap="round" />
          <rect x="12.4" y="28" width="3.6" height="13" rx="1.6" fill="#f6ead4" stroke={INK} strokeWidth="1.1" />
          <path d="M7.8 30.5C7.8 22.5 20.6 22.5 20.6 30.5Z" fill="#d9604a" {...O} strokeWidth="1.3" />
          <circle cx="11.4" cy="27.4" r="1.1" fill="#fffaf1" />
          <circle cx="15.4" cy="25.4" r="1.3" fill="#fffaf1" />
          <circle cx="17.8" cy="28.6" r=".9" fill="#fffaf1" />
          <rect x="21" y="34" width="2.8" height="7.5" rx="1.3" fill="#f6ead4" stroke={INK} strokeWidth="1" />
          <path d="M17.8 35.6C17.8 30.4 27 30.4 27 35.6Z" fill="#e9884f" {...O} strokeWidth="1.2" />
          <circle cx="21" cy="33" r=".8" fill="#fffaf1" />
          <circle cx="24.2" cy="33.6" r=".7" fill="#fffaf1" />
          <path d={J} fill="none" {...O} />
          <path d="M9 20V38" stroke="#fff" strokeWidth="1.6" opacity=".75" strokeLinecap="round" />
          <path d="M24.6 19V24" stroke="#fff" strokeWidth="1.2" opacity=".5" strokeLinecap="round" />
          <rect x="9" y="6" width="16" height="9.5" rx="2" fill="#b98a5e" {...O} />
          <path d="M11 9H23M11 12H23" stroke="#8a6a4f" strokeWidth=".8" strokeDasharray="1 1.6" />
          <path d="M8 15.6H26" stroke="#c9a46a" strokeWidth="1.8" strokeLinecap="round" />
          {cord('M24 15.6C27 17 27.5 20 26 22', '#c9a46a', 1)}
        </g>
      );
    },
  },
  herbBundle: {
    name: 'Drying herbs', w: 44, h: 88, where: 'wall', set: ['witchy', 'boho', 'plant'],
    art: () => {
      const S = [[7, 66], [13, 78], [22, 84], [31, 78], [37, 66]];
      const q = (x, y) => [[22, 28], [(22 + x) / 2, (28 + y) / 2 - 3], [x, y]];
      const sage = ['#a3ab7c', '#b8b083', '#8f9a6a'];
      return (
        <g>
          <path d="M16 23L22 4L28 23" stroke="#c9a46a" strokeWidth="1.3" fill="none" />
          {nail(22, 4)}
          {cord('M19 26L17.6 16M22 26V14.6M25 26L26.4 16', '#8a7a52', 1.3)}
          {S.map(([x, y], i) => <g key={i}>{cord(`M22 28Q${q(x, y)[1]} ${x} ${y}`, '#8a7a52', 0.9)}</g>)}
          {[[0, 0.3], [4, 0.3], [1, 0.36], [3, 0.36]].map(([si, t0]) => [0, 0.16, 0.32, 0.48, 0.62].filter((u) => si === 0 || si === 4 || u < 0.3).map((u, j) => {
            const t = t0 + u;
            const [a, b, c] = q(...S[si]), [x, y] = qpt(a, b, c, t), side = j % 2 ? 1 : -1, ang = (si > 2 ? 62 : 118) + side * 38;
            return <ellipse key={si + '-' + j} cx={x + Math.cos((ang * Math.PI) / 180) * 3} cy={y + Math.sin((ang * Math.PI) / 180) * 3} rx="3.6" ry="1.9" transform={`rotate(${ang} ${x + Math.cos((ang * Math.PI) / 180) * 3} ${y + Math.sin((ang * Math.PI) / 180) * 3})`} fill={sage[(j + si) % 3]} stroke={INK} strokeWidth="1.1" />;
          }))}
          {[1, 2, 3].map((si) => Array.from({ length: 6 }, (_, j) => {
            const [a, b, c] = q(...S[si]), t = 0.7 + j * 0.06, [x, y] = qpt(a, b, c, t);
            return <ellipse key={si + '-' + j} cx={x + (j % 2 ? 1.3 : -1.3)} cy={y} rx="1.5" ry="2.1" fill={j % 2 ? '#9d7aa8' : '#b79cc4'} stroke={INK} strokeWidth=".8" />;
          }))}
          {[[18, 52], [27, 50], [22, 46]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.5" fill="#e3c477" stroke={INK} strokeWidth=".7" />)}
          <rect x="16.5" y="22" width="11" height="6.5" rx="2" fill="#c9a46a" {...O} strokeWidth="1.2" />
          <path d="M18 23L26 27.5M18 26.8L22.5 23" stroke="#a8844a" strokeWidth=".9" strokeLinecap="round" />
        </g>
      );
    },
  },
  candlestick: {
    name: 'Brass candlestick', w: 28, h: 70, where: 'shelf', set: ['witchy', 'cozy'], wax: true,
    art: ({ wax } = {}) => { const k = waxSet(wax); return (
      <g>
        <path d="M3 70H25Q25 64 18 62.5H10Q3 64 3 70Z" fill={G.gold} {...O} />
        <path d="M11.5 62.5L12.2 38H15.8L16.5 62.5Z" fill={G.gold} {...O} />
        <path d="M15 39V61.6" stroke="#b8933f" strokeWidth="1.2" strokeLinecap="round" />
        <ellipse cx="14" cy="52" rx="4.2" ry="2.6" fill={G.gold} {...O} strokeWidth="1.3" />
        <ellipse cx="14" cy="44" rx="3.2" ry="2" fill={G.gold} {...O} strokeWidth="1.3" />
        <path d="M18 63.6Q23.4 64.6 24 69.2H19.5C20 67 19.6 65 18 63.6Z" {...SH} />
        <rect x="10.5" y="16" width="7" height="21" rx="1.5" fill={k ? k.body : '#efe0c4'} {...O} />
        <rect x="14.6" y="17" width="2.2" height="19" rx="1" {...(k ? { fill: k.shade } : SH)} />
        <path d="M10.8 17.5H17.2V19C16.4 20 16 19.2 15.8 20.4V25C15.8 26.4 14.2 26.4 14.2 25V20.6C12.6 21.2 11.4 20.6 10.8 19.6Z" fill={k ? k.drip : '#fbf3e3'} />
        <path d="M10.6 19.5C9.8 22 10.2 24 9.6 25.8C9.2 27.2 11 27.6 11.2 26V20Z" fill={k ? k.drip : '#fbf3e3'} stroke={INK} strokeWidth=".9" strokeLinejoin="round" />
        <path d="M14 16V13" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
        {flame(14, 13)}
        <ellipse cx="14" cy="37.4" rx="9" ry="2.6" fill={G.gold} {...O} />
        <path d="M6 37.6C5.6 39.4 6.6 40.4 7.6 39.4" fill={k ? k.drip : '#fbf3e3'} stroke={INK} strokeWidth=".9" strokeLinejoin="round" />
        <path d="M6.5 67C7 65.5 8.5 64.4 10.5 64" stroke="#fff" strokeWidth="1.4" opacity=".6" fill="none" strokeLinecap="round" />
      </g>
    ); },
  },
  hourglass: {
    name: 'Hourglass', w: 32, h: 50, where: 'shelf', set: ['witchy', 'minimal'],
    art: () => {
      const GL = 'M9 7C9 17 15 21 15 25C15 29 9 33 9 43H23C23 33 17 29 17 25C17 21 23 17 23 7Z';
      return (
        <g>
          <path d={GL} fill="#e6f1ee" />
          <path d="M10.6 14.5H21.4C20.6 18.5 17 21 16 24C15 21 11.4 18.5 10.6 14.5Z" fill="#e3c477" />
          <path d="M16 24.5V40" stroke="#e3c477" strokeWidth="1.1" />
          <path d="M10 43C10.6 37.5 13.6 35 16 35C18.4 35 21.4 37.5 22 43Z" fill="#e3c477" />
          <path d="M10.6 14.5H21.4" stroke="#c9a24e" strokeWidth="1" />
          <path d={GL} fill="none" {...O} />
          <path d="M11.2 9.5C11.6 13 12.6 15.5 14 17.5M11.2 41C11.6 37.5 12.5 35.5 13.5 34" stroke="#fff" strokeWidth="1.3" opacity=".7" fill="none" strokeLinecap="round" />
          {cord('M5.5 7V43M26.5 7V43', G.wood, 2.4)}
          <rect x="3" y="2" width="26" height="5.5" rx="2" fill={G.wood} {...O} />
          <rect x="3" y="42.5" width="26" height="7.5" rx="2" fill={G.wood} {...O} />
          <rect x="5" y="3" width="10" height="1.2" rx=".6" {...HL} />
          <path d="M6 46.2H26" stroke="#8a6a4f" strokeWidth="1" strokeLinecap="round" />
        </g>
      );
    },
  },

  // ---------- Coquette ----------
  bow: {
    name: 'Ribbon bow', w: 70, h: 64, where: 'wall', set: ['coquette'],
    art: () => (
      <g>
        {bow(35, 26, 2.1)}
        <path d="M14 21C15 17 18 15 21 15" stroke="#fff" strokeWidth="2" opacity=".6" fill="none" strokeLinecap="round" />
        <path d="M49 15C52 15 55 17 56 21" stroke="#fff" strokeWidth="2" opacity=".6" fill="none" strokeLinecap="round" />
        <circle cx="35" cy="26" r="2.6" fill="#fffaf1" {...O} strokeWidth="1.1" />
      </g>
    ),
  },
  flowerVase: {
    name: 'Vase of flowers', w: 44, h: 66, where: 'shelf', set: ['coquette', 'cozy'],
    art: () => {
      const F = [[12, 20, 6.5, G.pink], [32, 19, 6.5, '#e88fa5'], [22, 11, 7, '#f5c6d0'], [16, 30, 5.5, '#f5c6d0'], [29, 30, 5.5, G.pink]];
      return (
        <g>
          {cord('M22 42Q16 30 12 20M22 42Q22 24 22 11M22 42Q28 30 32 19', '#6f9a5c', 1.2)}
          {leaf(19, 33, 0.45, -150, G.leaf)}
          {leaf(25, 33, 0.45, -30, G.light)}
          {F.map(([x, y, r, c], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={r} fill={c} {...O} />
              <path d={`M${x - r * 0.45} ${y + r * 0.1}C${x - r * 0.4} ${y - r * 0.55} ${x + r * 0.5} ${y - r * 0.5} ${x + r * 0.4} ${y + r * 0.1}C${x + r * 0.3} ${y + r * 0.45} ${x - r * 0.15} ${y + r * 0.4} ${x - r * 0.1} ${y}`} stroke={G.rose} strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <circle cx={x - r * 0.45} cy={y - r * 0.45} r={r * 0.18} {...HL} />
            </g>
          ))}
          {[[6, 28], [38, 27], [9, 11], [36, 9]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.5" fill="#fffaf1" stroke={INK} strokeWidth=".8" />)}
          <path d="M14 66H30C38 62 38 48 30 44V38H14V44C6 48 6 62 14 66Z" fill={G.blush} {...O} />
          <path d="M31 46C36 50 36 61 30 65H26C32 60 33 50 31 46Z" {...SH} />
          <rect x="12.5" y="36" width="19" height="4" rx="2" fill={G.blush} {...O} />
          {[[14, 52], [22, 56], [18, 61], [26, 49], [12, 58]].map(([x, y]) => <path key={x + '' + y} d={tp(HEART, x, y, 0.22)} fill="#fff" opacity=".85" />)}
        </g>
      );
    },
  },
  perfume: {
    name: 'Perfume bottle', w: 34, h: 44, where: 'shelf', set: ['coquette'],
    art: () => (
      <g>
        <rect x="13" y="12" width="8" height="8" fill={G.gold} {...O} />
        <rect x="4" y="18" width="26" height="26" rx="6" fill="#f9e6ea" {...O} />
        <rect x="6.5" y="26" width="21" height="15.5" rx="4" fill="#f0b2c2" />
        <path d="M8 22C7 26 7 34 8 38" stroke="#fff" strokeWidth="2" opacity=".75" fill="none" strokeLinecap="round" />
        <path d="M24 28V39" stroke={INK} strokeWidth="1" opacity=".18" strokeLinecap="round" />
        <path d="M10 13L12 4H22L24 13Z" fill="#f5d7dd" {...O} />
        <path d="M17 4V13M12 8.5H22" stroke={INK} strokeWidth=".8" opacity=".35" />
        <path d="M13 5.5L12.4 9" stroke="#fff" strokeWidth="1.2" opacity=".8" strokeLinecap="round" />
        {bow(17, 16.5, 0.42, '#e88fa5', '#c96a82')}
      </g>
    ),
  },
  teacup: {
    name: 'Teacup', w: 50, h: 32, where: 'shelf', set: ['coquette', 'cozy'],
    art: () => (
      <g>
        <path d="M20 8C17 5 22 3 19 0M27 8C24 5 29 3 26 0" stroke="#b3a797" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <ellipse cx="25" cy="28.4" rx="23" ry="3.4" fill={G.cream} {...O} />
        <ellipse cx="25" cy="28" rx="14" ry="1.6" fill={G.pink} opacity=".5" />
        {cord('M39 14C46.5 13 47 22.5 37 23', G.cream, 2.4)}
        <rect x="18" y="24" width="12" height="4" rx="1.5" fill={G.cream} {...O} />
        <path d="M8 11H40C40 20 35 27 24 27C13 27 8 20 8 11Z" fill={G.cream} {...O} />
        <path d="M33 13H39C38.5 20 34 25.5 27 26.5C33 23 34 18 33 13Z" {...SH} />
        {[[14, 17], [21, 21], [28, 16], [19, 14.6], [33, 21]].map(([x, y]) => <path key={x} d={tp(HEART, x, y, 0.2)} fill={G.pink} />)}
        <ellipse cx="24" cy="11" rx="16" ry="2.6" fill="#c99a6a" {...O} />
        <path d="M11 13.6H37" stroke={G.gold} strokeWidth="1" opacity=".8" />
      </g>
    ),
  },
  ovalMirror: {
    name: 'Ornate mirror', w: 60, h: 88, where: 'wall', set: ['coquette'],
    art: () => (
      <g>
        <path d="M30 4L19 23M30 4L41 23" stroke={G.pink} strokeWidth="1.4" />
        {nail(30, 4)}
        {Array.from({ length: 16 }, (_, i) => {
          const t = (i / 16) * Math.PI * 2;
          return <circle key={i} cx={30 + 24 * Math.cos(t)} cy={52 + 32 * Math.sin(t)} r="3.2" fill="#e3c477" {...O} />;
        })}
        <ellipse cx="30" cy="52" rx="24" ry="32" fill="#e3c477" {...O} />
        <ellipse cx="30" cy="52" rx="20.5" ry="28.5" fill="none" stroke="#b8933f" strokeWidth="1.2" strokeDasharray="1.5 2.5" strokeLinecap="round" />
        <ellipse cx="30" cy="52" rx="18" ry="26" fill="#dbe7fa" {...O} />
        <path d="M40 34C47 44 46 62 38 72C42 60 43 46 40 34Z" fill="#9fb4d6" opacity=".45" />
        <path d="M17 50L28 33M19 60L34 38" stroke="#fff" strokeWidth="2.6" opacity=".7" strokeLinecap="round" />
        {bow(30, 21, 0.6)}
      </g>
    ),
  },
  heartFrame: {
    name: 'Heart frame', w: 56, h: 58, where: 'wall', set: ['coquette'],
    art: () => (
      <g>
        <path d="M28 4L15 22M28 4L41 22" stroke="#8a7a62" strokeWidth="1.2" />
        {nail(28, 4)}
        <path d={tp(HEART, 28, 34, 2.6)} fill={G.pink} {...O} />
        <path d={tp(HEART, 28, 34.5, 1.8)} fill="#fff4f0" {...O} />
        <path d={tp('M-5 -0.5C-8 2 -4 6 0 8', 28, 34.5, 1.8)} stroke="#f5d7dd" strokeWidth="4" fill="none" strokeLinecap="round" />
        {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={28 + 3.2 * Math.cos((a * Math.PI) / 180)} cy={33 + 3.2 * Math.sin((a * Math.PI) / 180)} r="2.6" fill="#f5c6d0" stroke={INK} strokeWidth=".9" />)}
        <circle cx="28" cy="33" r="1.8" fill="#f3d98a" />
        <path d="M11 27C11.5 23.5 14 21 17 21" stroke="#fff" strokeWidth="2" opacity=".6" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  bowGarland: {
    name: 'Bow garland', w: 220, h: 50, where: 'wall', set: ['coquette'],
    art: () => {
      const A = [4, 6], B = [110, 34], C = [216, 6];
      return (
        <g>
          <path d="M4 6Q110 34 216 6" stroke={G.rose} strokeWidth="1.4" fill="none" />
          {nail(4, 6)}
          {nail(216, 6)}
          {[0.15, 0.32, 0.5, 0.68, 0.85].map((t) => {
            const [x, y] = qpt(A, B, C, t - 0.085);
            return <circle key={t} cx={x} cy={y + 0.6} r="2.2" fill="#fffaf1" stroke={INK} strokeWidth=".9" />;
          })}
          {[0.15, 0.32, 0.5, 0.68, 0.85].map((t, i) => {
            const [x, y] = qpt(A, B, C, t);
            return <g key={t}>{i % 2 ? bow(x, y, 0.85, G.cream, '#e3c9b8') : bow(x, y, 0.85)}</g>;
          })}
          {(() => { const [x, y] = qpt(A, B, C, 0.925); return <circle cx={x} cy={y + 0.6} r="2.2" fill="#fffaf1" stroke={INK} strokeWidth=".9" />; })()}
        </g>
      );
    },
  },
  pearlDish: {
    name: 'Pearl dish', w: 46, h: 22, where: 'shelf', set: ['coquette'],
    art: () => (
      <g>
        <path d="M3 10C5 18 12 22 23 22C34 22 41 18 43 10Z" fill={G.blush} {...O} />
        <path d="M34 13C38 13 41 12 42 10.5C40.5 16.5 36 20 29 21.4C33 19 34.5 16 34 13Z" {...SH} />
        <ellipse cx="23" cy="10" rx="20" ry="5" fill="#fbe9ec" {...O} />
        <ellipse cx="23" cy="10" rx="17.5" ry="3.6" fill="none" stroke={G.gold} strokeWidth="1" />
        <circle cx="13" cy="7" r="3" fill="none" stroke={G.gold} strokeWidth="1.4" />
        <circle cx="13" cy="4" r="1.3" fill="#c3a6d6" stroke={INK} strokeWidth=".7" />
        {Array.from({ length: 14 }, (_, i) => {
          const t = Math.PI * 2 * (i / 14) - Math.PI / 2;
          return <circle key={i} cx={24 + 10 * Math.cos(t)} cy={9.6 + 3 * Math.sin(t)} r="1.7" fill="#fffaf1" stroke={INK} strokeWidth=".8" />;
        })}
        {[[33.6, 11.8], [35.6, 14], [37, 16.4], [37.6, 19]].map(([x, y]) => <circle key={y} cx={x} cy={y} r="1.7" fill="#fffaf1" stroke={INK} strokeWidth=".8" />)}
      </g>
    ),
  },

  jewelryBox: {
    name: 'Jewelry box', w: 54, h: 44, where: 'shelf', set: ['coquette'],
    art: () => {
      const pearls = (a, b, c, n) => Array.from({ length: n }, (_, i) => {
        const [x, y] = qpt(a, b, c, i / (n - 1));
        return <circle key={i} cx={x} cy={y} r="1.8" fill="#fffaf1" stroke={INK} strokeWidth=".8" />;
      });
      return (
        <g>
          <path d="M8 22L11 3H43L46 22Z" fill={G.pink} {...O} />
          <path d="M12.5 19.5L14.6 6.5H39.4L41.5 19.5Z" fill="#fbe9ec" />
          <ellipse cx="27" cy="12.6" rx="7.5" ry="4.6" fill="#dbe7fa" {...O} strokeWidth="1.2" />
          <path d="M23.6 14.4L27 10.6M26.2 15.4L28.6 12.6" stroke="#fff" strokeWidth="1.2" opacity=".8" strokeLinecap="round" />
          <rect x="6" y="18.5" width="42" height="6" rx="1.5" fill="#c96a82" {...O} />
          {pearls([12, 21.5], [21, 14], [31, 21.5], 7)}
          <circle cx="37" cy="20" r="2.6" fill="none" stroke={G.gold} strokeWidth="1.4" />
          <circle cx="37" cy="17.4" r="1.2" fill="#c3a6d6" stroke={INK} strokeWidth=".7" />
          <rect x="4" y="22" width="46" height="18" rx="3" fill={G.pink} {...O} />
          <path d="M5.4 27H48.6" stroke={G.rose} strokeWidth="1.1" />
          <path d="M39 27.6H48.6V37Q48.6 39 46.6 39H37C39 35 39.6 31 39 27.6Z" {...SH} />
          <rect x="6.5" y="23.6" width="12" height="1.6" rx=".8" {...HL} />
          <rect x="24" y="27.4" width="6" height="5" rx="1.2" fill={G.gold} stroke={INK} strokeWidth="1" />
          <circle cx="27" cy="30" r=".9" fill={INK} />
          {pearls([31, 23], [39, 37], [46, 23.5], 7)}
          <circle cx="9.5" cy="41.4" r="2.3" fill={G.gold} {...O} strokeWidth="1.1" />
          <circle cx="44.5" cy="41.4" r="2.3" fill={G.gold} {...O} strokeWidth="1.1" />
          {[[12, 34], [17, 31.5], [19, 36]].map(([x, y]) => <path key={x} d={tp(HEART, x, y, 0.2)} fill="#fff" opacity=".85" />)}
        </g>
      );
    },
  },
  balletSlippers: {
    name: 'Ballet slippers', w: 64, h: 32, where: 'shelf', set: ['coquette'],
    art: () => {
      const SL = 'M3 26C3 20 8 17 14 17.5C19 18 22 20.5 28 20.5C34 20.5 39 22 40.5 25.5C41.5 29 39 31 34 31H7C4.5 31 3 29 3 26Z';
      const shoe = (dx, dy, c, inner) => (
        <g>
          <path d={tp(SL, dx, dy)} fill={c} {...O} />
          <path d={tp('M5.5 21.5C8 18.4 17.5 18.4 23.5 21C19.5 24 9 24.4 5.5 21.5Z', dx, dy)} fill={inner} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
          <path d={tp('M5 29L37.5 29', dx, dy)} stroke={inner} strokeWidth="1.3" strokeLinecap="round" />
          <path d={tp('M29 23.4C32 23.2 35.5 24 37.5 26', dx, dy)} stroke="#fff" strokeWidth="1.4" opacity=".6" fill="none" strokeLinecap="round" />
          <ellipse cx={24.4 + dx} cy={20.4 + dy} rx="1.9" ry="1.2" fill="none" stroke={inner} strokeWidth="1.1" transform={`rotate(-30 ${24.4 + dx} ${20.4 + dy})`} />
          <ellipse cx={27.6 + dx} cy={20.4 + dy} rx="1.9" ry="1.2" fill="none" stroke={inner} strokeWidth="1.1" transform={`rotate(30 ${27.6 + dx} ${20.4 + dy})`} />
          <circle cx={26 + dx} cy={21.2 + dy} r=".9" fill={inner} />
        </g>
      );
      return (
        <g>
          {cord('M38 21C36 12 44 6 50 9C55 11.5 53 18 48 17C44 16 46 10 52 9C58 8 61 14 61 21C61 25 60 28 61 31', G.pink, 2.2)}
          {shoe(21, -1, '#efb8c6', '#d77f95')}
          {cord('M14 22C9 14 12 6 18 7C23 8 22 15 16 15C10 15 3 18 2 24C1.5 27 2 29 3 31', G.pink, 2.2)}
          {shoe(0, 0, '#f5c6d0', '#e391a6')}
        </g>
      );
    },
  },
  bowCandle: {
    name: 'Bow candle', w: 30, h: 46, where: 'shelf', set: ['coquette', 'cozy'], wax: true,
    art: ({ wax } = {}) => { const k = waxSet(wax); return (
      <g>
        <rect x="7" y="17" width="16" height="29" rx="2.5" fill={k ? k.body : '#f9e6ea'} {...O} />
        <rect x="17.5" y="18" width="4.6" height="27" rx="1.5" {...(k ? { fill: k.shade } : SH)} />
        <path d="M8 19H22V21C21 22.5 19.6 21 19 22.2V26.5C19 28.2 16.8 28.2 16.8 26.5V22.6C13 23.6 9.6 22.6 8 21Z" fill={k ? k.drip : '#fffaf1'} />
        <rect x="9" y="23" width="1.6" height="15" rx=".8" {...(k ? { fill: k.hl, opacity: 0.8 } : HL)} />
        <path d="M15 17V14" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
        {flame(15, 14)}
        <path d="M7 30H23V34H7Z" fill={G.pink} {...O} strokeWidth="1.2" />
        {bow(15, 32, 0.55)}
      </g>
    ); },
  },
  brushCup: {
    name: 'Makeup brushes', w: 36, h: 54, where: 'shelf', set: ['coquette'],
    art: () => {
      const brush = (x, r, len, bristle, handle, s = 1) => (
        <g>
          <path d={tp(`M-1.6 0L-1.2 -${len}L1.2 -${len}L1.6 0Z`, x, 46, s, r)} fill={handle} {...O} strokeWidth="1.2" />
          <path d={tp(`M-1.9 -${len}L-2.1 -${len + 5}L2.1 -${len + 5}L1.9 -${len}Z`, x, 46, s, r)} fill={G.gold} {...O} strokeWidth="1.2" />
          <path d={tp(`M-2.2 -${len + 5}C-4.8 -${len + 9} -3.2 -${len + 15} 0 -${len + 16}C3.2 -${len + 15} 4.8 -${len + 9} 2.2 -${len + 5}Z`, x, 46, s, r)} fill={bristle} {...O} strokeWidth="1.2" />
          <path d={tp(`M-1 -${len + 8}C-1.4 -${len + 11} -0.6 -${len + 13} 0.4 -${len + 14}`, x, 46, s, r)} stroke="#fff" strokeWidth="1" opacity=".5" fill="none" strokeLinecap="round" />
        </g>
      );
      return (
        <g>
          {brush(13, -17, 22, '#8a6a4f', '#3d3121', 0.95)}
          {brush(23, 18, 20, '#e3c9b8', G.pink, 0.95)}
          {brush(17, -6, 26, '#f0a8b8', '#f5d7dd', 1.05)}
          {brush(20, 6, 22, '#3d3121', '#fffaf1', 0.8)}
          <path d="M8 33H28L26.5 51.5Q26 54 23.5 54H12.5Q10 54 9.5 51.5Z" fill={G.blush} {...O} />
          <path d="M22 35H27.6L26.2 51.2Q25.8 53 23.6 53.2H20.5C23 48 23 40 22 35Z" {...SH} />
          <rect x="6.5" y="31" width="23" height="4" rx="2" fill={G.blush} {...O} />
          {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={9.5 + i * 3.4} cy="33" r="1.1" fill="#fffaf1" stroke={INK} strokeWidth=".6" />)}
          {[[14, 42], [19, 46], [16, 49.5]].map(([x, y]) => <path key={y} d={tp(HEART, x, y, 0.24)} fill={G.pink} />)}
          <rect x="10.6" y="37" width="1.6" height="10" rx=".8" {...HL} />
        </g>
      );
    },
  },
  cakeStand: {
    name: 'Cake stand', w: 48, h: 54, where: 'shelf', set: ['coquette', 'cozy'],
    art: () => (
      <g>
        <path d="M13 54H35Q35 48.5 28 47.5H20Q13 48.5 13 54Z" fill="#fffaf1" {...O} />
        <rect x="21" y="35" width="6" height="13" fill="#fffaf1" {...O} />
        <ellipse cx="24" cy="41.5" rx="4.6" ry="2.2" fill="#fffaf1" {...O} strokeWidth="1.2" />
        <ellipse cx="24" cy="33.5" rx="22" ry="4" fill="#fbe9ec" {...O} />
        <path d="M5 35.5Q24 41 43 35.5" stroke={G.pink} strokeWidth="1" fill="none" strokeDasharray="1.6 2" strokeLinecap="round" />
        <rect x="11" y="15" width="26" height="18" rx="2" fill="#f5c6d0" {...O} />
        <rect x="11.8" y="24.4" width="24.4" height="2.8" fill="#fffaf1" />
        <path d="M11 24.4H37M11 27.2H37" stroke={INK} strokeWidth=".8" opacity=".35" />
        <rect x="30.5" y="16" width="5.6" height="16.2" rx="1.5" {...SH} />
        <path d="M10 15Q10 12 13 12H35Q38 12 38 15V18.5C38 20.5 35.6 20.8 35.2 18.6C34.6 21.6 31.4 21.6 31 18.8C30.4 20.4 28 20.4 27.6 18.6C27 22 23.4 22 23 18.6C22.4 20.2 20 20.2 19.6 18.4C19 21.2 15.8 21.2 15.4 18.6C14.8 20.2 12.4 20.4 12 18.6C11.4 19.8 10 19.6 10 18.2Z" fill="#fffaf1" {...O} />
        {[[14, 14.6, '#f0a8b8', 20], [18.5, 15.6, '#9cc2e0', -30], [29, 14.4, '#f3d98a', 35], [33, 15.8, '#9cc283', -15], [21, 13.8, '#c3a6d6', 70]].map(([x, y, c, a]) => (
          <path key={x} d={tp('M-1.2 0L1.2 0', x, y, 1, a)} stroke={c} strokeWidth="1.3" strokeLinecap="round" />
        ))}
        {cord('M24.6 8C25.4 5 27 3 29.5 2', '#6f9a5c', 1)}
        <circle cx="24" cy="9.2" r="3.2" fill="#d6455e" {...O} strokeWidth="1.3" />
        <circle cx="23" cy="8.2" r=".9" fill="#fff" opacity=".8" />
        <path d="M14 30.5V28" stroke="#fff" strokeWidth="1.4" opacity=".55" strokeLinecap="round" />
      </g>
    ),
  },
  lacePillow: {
    name: 'Lace pillow', w: 50, h: 42, where: 'shelf', set: ['coquette', 'cozy'],
    art: () => {
      const P = 'M-17 -15C-7 -12 7 -12 17 -15C14 -5 14 5 17 15C7 12 -7 12 -17 15C-14 5 -14 -5 -17 -15Z';
      const d = tp(P, 25, 23);
      return (
        <g>
          <path d={d} fill="none" stroke={INK} strokeWidth="7.6" strokeDasharray="0.01 4.4" strokeLinecap="round" />
          <path d={d} fill="none" stroke="#fffaf1" strokeWidth="5.6" strokeDasharray="0.01 4.4" strokeLinecap="round" />
          <path d={d} fill="#f9e6ea" {...O} />
          <path d={tp(P, 25, 23, 0.78)} fill="none" stroke={G.rose} strokeWidth="1" strokeDasharray="1.4 1.8" strokeLinecap="round" />
          <path d="M37 13C35 20 35 28 38 34C39.6 34.4 40.5 34.6 41 35C38.5 28 38.5 18 41 11C39.5 11.8 38.4 12.4 37 13Z" {...SH} />
          <path d="M11 13C12 16 12.4 19 12.2 22" stroke="#fff" strokeWidth="1.8" opacity=".7" fill="none" strokeLinecap="round" />
          {[[15, 31], [34, 30], [17, 15.6], [33, 15]].map(([x, y]) => <path key={x} d={tp(HEART, x, y, 0.22)} fill={G.pink} />)}
          {bow(25, 22, 0.72)}
        </g>
      );
    },
  },

  // ---------- Boho ----------
  macrame: {
    name: 'Macrame hanging', w: 70, h: 110, where: 'wall', set: ['boho'],
    art: () => {
      const yb = (x) => { const t = (x - 9) / 52; return 46 + 48 * t * (1 - t); };
      const cords = Array.from({ length: 13 }, (_, i) => 11 + i * 4);
      return (
        <g>
          <path d="M6 10L35 2L64 10" stroke="#8a6a4f" strokeWidth="1.1" fill="none" />
          {nail(35, 2)}
          {cords.map((x) => <g key={x}>{cord(`M${x} ${yb(x) - 3}V${104 - Math.abs(x - 35) * 0.8}`, '#f1e6d0', 1.8)}</g>)}
          <path d="M9 13H61V46Q35 70 9 46Z" fill="#f1e6d0" {...O} />
          {cords.map((x) => <path key={x} d={`M${x} 14V${yb(x) - 1.5}`} stroke="#d9c8a8" strokeWidth="1" />)}
          <path d="M12 18L35 40L58 18M12 29L35 51L58 29" stroke="#c9b48c" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {[[35, 22], [27, 27], [43, 27], [35, 32], [19, 38], [51, 38], [35, 59]].map(([x, y]) => <ellipse key={x + '' + y} cx={x} cy={y} rx="2.8" ry="2" fill="#e3d4b8" stroke={INK} strokeWidth=".9" />)}
          <circle cx="27" cy="71" r="2.6" fill={G.wood} {...O} strokeWidth="1.2" />
          <circle cx="43" cy="71" r="2.6" fill={G.wood} {...O} strokeWidth="1.2" />
          <rect x="3" y="8" width="64" height="5" rx="2.5" fill={G.wood} {...O} />
          <rect x="6" y="9" width="20" height="1.3" rx=".65" {...HL} />
        </g>
      );
    },
  },
  pampas: {
    name: 'Pampas grass', w: 50, h: 100, where: 'shelf', set: ['boho', 'minimal'],
    art: () => {
      const P = 'M0 0C3 -3 10 -5.5 22 -4.5C28 -4 31 -1.5 32 0C31 1.5 28 4 22 4.5C10 5.5 3 3 0 0Z';
      const L = [[12, 50, -125, 0.62], [38, 50, -55, 0.62], [17, 40, -108, 0.9], [33, 40, -72, 0.9], [25, 34, -90, 0.95]];
      return (
        <g>
          {cord(L.map(([x, y]) => `M25 66Q${25 + (x - 25) * 0.3} ${(66 + y) / 2} ${x} ${y}`).join(''), '#c9b48c', 1.1)}
          {L.map(([x, y, a, s], i) => (
            <g key={i}>
              <path d={tp(P, x, y, s, a)} fill={i % 2 ? '#e6d2ae' : '#efe2c8'} {...O} />
              <path d={tp('M4 0L28 0M8 -2L16 -3.4M12 2L22 3', x, y, s, a)} stroke="#c9b48c" strokeWidth="1" strokeLinecap="round" />
            </g>
          ))}
          <path d="M15 100H35C38 92 39 80 33 72V64H17V72C11 80 12 92 15 100Z" fill="#e9dcc6" {...O} />
          <path d="M31 73C36 80 36 91 33 99H28C32 91 33 80 31 73Z" {...SH} />
          <rect x="15.5" y="61.5" width="19" height="4" rx="2" fill="#e9dcc6" {...O} />
          {[[19, 82], [23, 90], [28, 78], [21, 74], [27, 94]].map(([x, y]) => <circle key={y} cx={x} cy={y} r=".7" fill="#8a7a62" />)}
        </g>
      );
    },
  },
  sunMirror: {
    name: 'Sun mirror', w: 100, h: 100, where: 'wall', set: ['boho'],
    art: () => (
      <g>
        {Array.from({ length: 20 }, (_, i) => {
          const t = (i / 20) * Math.PI * 2 - Math.PI / 2, r2 = i % 2 ? 40 : 46;
          const x2 = 50 + r2 * Math.cos(t), y2 = 52 + r2 * Math.sin(t);
          return (
            <g key={i}>
              {cord(`M${50 + 28 * Math.cos(t)} ${52 + 28 * Math.sin(t)}L${x2} ${y2}`, G.rattan, 2.8)}
              {i % 2 === 0 && <circle cx={x2} cy={y2} r="2.6" fill="#c9965a" {...O} strokeWidth="1.2" />}
            </g>
          );
        })}
        <circle cx="50" cy="52" r="30" fill="#c9965a" {...O} />
        <circle cx="50" cy="52" r="26" fill="none" stroke="#a8784a" strokeWidth="2.2" strokeDasharray="3 2.2" />
        <circle cx="50" cy="52" r="21" fill="#dbe7fa" {...O} />
        <path d="M62 38C69 46 68 60 60 67C64 58 65 46 62 38Z" fill="#9fb4d6" opacity=".45" />
        <path d="M37 54L48 39M40 62L56 41" stroke="#fff" strokeWidth="2.6" opacity=".7" strokeLinecap="round" />
      </g>
    ),
  },
  basket: {
    name: 'Woven basket', w: 54, h: 40, where: 'shelf', set: ['boho', 'cozy'],
    art: () => (
      <g>
        <path d="M10 15C11 5 25 2 29 8C33 2 45 5 45 15Z" fill="#a9b89a" {...O} />
        <path d="M16 13C16 9 18 7 20 6M24 13C24 10 25 8 27 7M35 13C35 10 36 8 38 7.5" stroke="#879877" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {cord('M6 16C0.5 16 0.5 23.5 7 23.5', '#c9965a', 2)}
        {cord('M48 16C53.5 16 53.5 23.5 47 23.5', '#c9965a', 2)}
        <path d="M5 14H49L45 37Q44.5 40 41 40H13Q9.5 40 9 37Z" fill={G.rattan} {...O} />
        <path d="M6.2 21H47.8M7.3 27.5H46.7M8.4 33.5H45.6" stroke="#a8784a" strokeWidth="1.1" />
        {[0, 1, 2].map((r) => Array.from({ length: 8 }, (_, i) => {
          const x = 10 + i * 5 + (r % 2) * 2.5, y = 21 + r * 6.3;
          return <path key={r + '-' + i} d={`M${x} ${y + 1}V${y + 5}`} stroke="#b58a52" strokeWidth="1.4" strokeLinecap="round" />;
        }))}
        <path d="M38 17H47.6L44.4 36Q44 38.5 41 39H35C38 34 39 25 38 17Z" {...SH} />
        <rect x="3" y="12" width="48" height="5" rx="2.5" fill="#c9965a" {...O} />
        <rect x="6" y="13" width="14" height="1.3" rx=".65" {...HL} />
      </g>
    ),
  },
  wovenRug: {
    name: 'Round woven rug', w: 220, h: 40, where: 'floor', set: ['boho', 'cozy'], fab: true,
    art: ({ tint } = {}) => { const k = tint && rp(tint); return (
      <g>
        {Array.from({ length: 44 }, (_, i) => {
          const t = (i / 44) * Math.PI * 2;
          return <path key={i} d={`M${110 + 104 * Math.cos(t)} ${20 + 16.5 * Math.sin(t)}L${110 + 109 * Math.cos(t)} ${20 + 19.4 * Math.sin(t)}`} stroke={k ? k.d : '#c9b48c'} strokeWidth="1.4" strokeLinecap="round" />;
        })}
        <ellipse cx="110" cy="20" rx="106" ry="17" fill={k ? k.l : '#e3c99c'} {...O} />
        <ellipse cx="110" cy="20" rx="88" ry="14" fill={k ? k.b : '#d4ae78'} />
        <ellipse cx="110" cy="20" rx="70" ry="11" fill={k ? k.ll : '#ead6b2'} />
        <ellipse cx="110" cy="20" rx="52" ry="8.2" fill={k ? k.d : '#c99a6a'} />
        <ellipse cx="110" cy="20" rx="34" ry="5.4" fill={k ? k.ll : '#ead6b2'} />
        <ellipse cx="110" cy="20" rx="16" ry="2.6" fill={k ? k.b : '#d4ae78'} />
        {[97, 79, 61, 43, 25].map((rx) => <ellipse key={rx} cx="110" cy="20" rx={rx} ry={rx * 0.158} fill="none" stroke={k ? k.dd : '#b8935e'} strokeWidth=".9" strokeDasharray="2 2.4" opacity={k ? 0.6 : 1} />)}
        <path d="M8 22C14 32 50 36.5 110 37C170 36.5 206 32 212 22C205 29 170 33.5 110 34C50 33.5 15 29 8 22Z" {...SH} />
      </g>
    ); },
  },
  fringeRug: {
    name: 'Fringed rug', w: 220, h: 40, where: 'floor', set: ['boho', 'minimal', 'cozy'], fab: true,
    art: ({ tint } = {}) => { const k = rp(tint || '#c96f4a'); return (
      <g>
        {fringe(k.ll)}
        {rugEdge(k.dd)}
        <path d={RQ(0, 0, 1, 1)} fill={k.b} {...O} />
        <path d={RQ(0.05, 0.14, 0.95, 0.86)} fill="none" stroke={k.ll} strokeWidth="2.4" />
        <path d={RQ(0.1, 0.28, 0.9, 0.72)} fill={k.d} />
        <path d={`M${RP(0.5, 0.3)}L${RP(0.62, 0.5)}L${RP(0.5, 0.7)}L${RP(0.38, 0.5)}Z`} fill={k.ll} stroke={INK} strokeWidth=".9" />
        <path d={`M${RP(0.5, 0.4)}L${RP(0.56, 0.5)}L${RP(0.5, 0.6)}L${RP(0.44, 0.5)}Z`} fill={k.b} />
        {[0.2, 0.8].map((u) => <path key={u} d={`M${RP(u, 0.38)}L${RP(u + 0.04, 0.5)}L${RP(u, 0.62)}L${RP(u - 0.04, 0.5)}Z`} fill={k.l} />)}
      </g>
    ); },
  },
  checkerRug: {
    name: 'Checker rug', w: 220, h: 40, where: 'floor', set: ['minimal', 'coquette', 'cozy'], fab: true,
    art: ({ tint } = {}) => { const k = rp(tint || '#f2b8c6'); return (
      <g>
        {rugEdge(k.d)}
        <path d={RQ(0, 0, 1, 1)} fill={k.ll} {...O} />
        {Array.from({ length: 40 }, (_, i) => { const c = i % 10, rw = Math.floor(i / 10); return (c + rw) % 2 ? null : <path key={i} d={RQ(c / 10, rw / 4, (c + 1) / 10, (rw + 1) / 4)} fill={k.b} />; })}
        <path d={RQ(0, 0, 1, 1)} fill="none" {...O} />
      </g>
    ); },
  },
  stripeRug: {
    name: 'Striped rug', w: 220, h: 40, where: 'floor', set: ['boho', 'plant', 'minimal'], fab: true,
    art: ({ tint } = {}) => { const k = rp(tint || '#a9b89a'), B = [k.b, k.ll, k.d, k.ll, k.l, k.ll, k.b]; return (
      <g>
        {fringe(k.ll)}
        {rugEdge(k.dd)}
        {B.map((c, i) => <path key={i} d={RQ(i / 7, 0, (i + 1) / 7, 1)} fill={c} />)}
        {[1, 3, 5].map((i) => <path key={'z' + i} d={`M${RP((i + 0.5) / 7, 0.15)}L${RP((i + 0.5) / 7, 0.85)}`} stroke={k.d} strokeWidth="1" strokeDasharray="3 3" />)}
        <path d={RQ(0, 0, 1, 1)} fill="none" {...O} />
      </g>
    ); },
  },
  persianRug: {
    name: 'Persian rug', w: 220, h: 40, where: 'floor', set: ['witchy', 'cozy'], fab: true,
    art: ({ tint } = {}) => { const k = rp(tint || '#7a2e35'), gold = '#d9b45a'; return (
      <g>
        {fringe('#efe4cc')}
        {rugEdge(k.dd)}
        <path d={RQ(0, 0, 1, 1)} fill={k.dd} {...O} />
        <path d={RQ(0.04, 0.12, 0.96, 0.88)} fill="none" stroke={gold} strokeWidth="1.6" />
        <path d={RQ(0.08, 0.24, 0.92, 0.76)} fill={k.b} stroke={gold} strokeWidth="1" />
        {Array.from({ length: 13 }, (_, i) => <circle key={i} cx={RP(0.06 + i * 0.073, 0.06).split(' ')[0]} cy={RP(0, 0.06).split(' ')[1]} r="1.1" fill={gold} />)}
        {Array.from({ length: 13 }, (_, i) => <circle key={'b' + i} cx={RP(0.04 + i * 0.077, 0.94).split(' ')[0]} cy={RP(0, 0.94).split(' ')[1]} r="1.3" fill={gold} />)}
        <path d={`M${RP(0.5, 0.28)}L${RP(0.66, 0.5)}L${RP(0.5, 0.72)}L${RP(0.34, 0.5)}Z`} fill={k.d} stroke={gold} strokeWidth="1.2" />
        <path d={`M${RP(0.5, 0.38)}L${RP(0.58, 0.5)}L${RP(0.5, 0.62)}L${RP(0.42, 0.5)}Z`} fill={gold} />
        {[[0.16, 0.36], [0.84, 0.36], [0.16, 0.64], [0.84, 0.64]].map(([u, v]) => <path key={u + '' + v} d={`M${RP(u, v - 0.08)}L${RP(u + 0.025, v)}L${RP(u, v + 0.08)}L${RP(u - 0.025, v)}Z`} fill={k.l} />)}
      </g>
    ); },
  },
  scallopRug: {
    name: 'Scalloped rug', w: 220, h: 40, where: 'floor', set: ['coquette'], fab: true,
    art: ({ tint } = {}) => { const k = rp(tint || '#f2b8c6'); return (
      <g>
        {Array.from({ length: 30 }, (_, i) => { const t = (i / 30) * Math.PI * 2; return <ellipse key={i} cx={110 + 98 * Math.cos(t)} cy={20 + 15.5 * Math.sin(t)} rx="9" ry="3.6" fill={k.b} {...O} strokeWidth="1.2" />; })}
        <ellipse cx="110" cy="20" rx="100" ry="15.6" fill={k.b} />
        <ellipse cx="110" cy="20" rx="84" ry="12.6" fill="none" stroke={k.ll} strokeWidth="1.6" strokeDasharray="4 3" />
        <ellipse cx="110" cy="20" rx="60" ry="9" fill={k.l} />
        <path d="M110 24.6C104 21 100 18.4 103.4 16.2C106 14.8 108.6 16 110 17.8C111.4 16 114 14.8 116.6 16.2C120 18.4 116 21 110 24.6Z" fill={k.d} stroke={INK} strokeWidth=".9" />
        <path d="M12 23C20 32 60 36.5 110 37C160 36.5 200 32 208 23C200 30 160 34 110 34.4C60 34 20 30 12 23Z" {...SH} />
      </g>
    ); },
  },
  mossRug: {
    name: 'Moss rug', w: 200, h: 40, where: 'floor', set: ['plant'], fab: true,
    art: ({ tint } = {}) => { const k = rp(tint || '#7f9a6a'); return (
      <g>
        {Array.from({ length: 46 }, (_, i) => { const t = (i / 46) * Math.PI * 2; return <circle key={i} cx={100 + 92 * Math.cos(t)} cy={20 + 15 * Math.sin(t)} r={3.6 + (i % 3)} fill={i % 2 ? k.b : k.d} {...O} strokeWidth="1.1" />; })}
        <ellipse cx="100" cy="20" rx="92" ry="15" fill={k.b} />
        {Array.from({ length: 40 }, (_, i) => { const a = i * 2.4, rr = 0.15 + ((i * 37) % 80) / 100; return <path key={'t' + i} d={`M${100 + 80 * rr * Math.cos(a)} ${20 + 12 * rr * Math.sin(a)}l1.2 -2.4`} stroke={i % 2 ? k.l : k.dd} strokeWidth="1.2" strokeLinecap="round" opacity=".7" />; })}
      </g>
    ); },
  },
  pouf: {
    name: 'Knit pouf', w: 64, h: 46, where: 'floor', set: ['boho', 'minimal', 'cozy'], fab: true,
    art: ({ tint } = {}) => { const k = rp(tint || '#efe4cc'); return (
      <g>
        <path d="M4 22C3 34 12 44 32 44C52 44 61 34 60 22Z" fill={k.d} {...O} />
        <ellipse cx="32" cy="20" rx="28" ry="12" fill={k.b} {...O} />
        {Array.from({ length: 7 }, (_, i) => { const x = 9 + i * 7.7; return <path key={i} d={`M${x} 26L${x + 3.8} 30L${x + 7.6} 26M${x} 32L${x + 3.8} 36L${x + 7.6} 32`} stroke={k.dd} strokeWidth="1" fill="none" opacity=".6" />; })}
        {Array.from({ length: 6 }, (_, i) => <path key={'r' + i} d={`M32 20L${32 + 25 * Math.cos(i * 1.047)} ${20 + 10.5 * Math.sin(i * 1.047)}`} stroke={k.d} strokeWidth="1" opacity=".55" />)}
        <circle cx="32" cy="20" r="2.4" fill={k.l} stroke={INK} strokeWidth=".9" />
        <path d="M12 16C16 11.6 24 9.6 32 9.4" stroke="#fff" strokeWidth="1.6" opacity=".45" fill="none" strokeLinecap="round" />
      </g>
    ); },
  },

  dreamcatcher: {
    name: 'Dreamcatcher', w: 52, h: 104, where: 'wall', set: ['boho', 'witchy'],
    art: () => {
      const R = 18, cy = 32, pt = (a, r) => [26 + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
      const A = Array.from({ length: 8 }, (_, i) => i * 45 - 90);
      const web = A.map((a, i) => { const [x1, y1] = pt(a, R - 1), [x2, y2] = pt(a + 22.5, 9), [x3, y3] = pt(A[(i + 1) % 8], R - 1); return `M${x1} ${y1}L${x2} ${y2}L${x3} ${y3}`; }).join('');
      const inner = A.map((a, i) => { const [x, y] = pt(a + 22.5, 9), [u, v] = pt(a + 22.5, 4); return `${i ? 'L' : 'M'}${x} ${y}M${x} ${y}L${u} ${v}`; }).join('');
      const F = 'M0 0C3.6 3 5.6 10 4.2 17C3.2 21 1.6 23.4 0 25C-1.6 23.4 -3.2 21 -4.2 17C-5.6 10 -3.6 3 0 0Z';
      const feather = (x, y, c, tip, s) => (
        <g>
          <path d={tp(F, x, y, s)} fill={c} {...O} strokeWidth="1.3" />
          <path d={tp('M-3.9 16.4C-1.6 18.4 1.6 18.4 3.9 16.4C3 20.6 1.6 23 0 24.6C-1.6 23 -3 20.6 -3.9 16.4Z', x, y, s)} fill={tip} />
          <path d={tp('M0 1.5L0 24M0 7L-2.6 4.6M0 11L2.8 8.4M0 15L-3 12.4', x, y, s)} stroke="#8a6a4f" strokeWidth=".9" fill="none" strokeLinecap="round" />
        </g>
      );
      const D = [[125, 14, 66, '#efe2c8', G.terra, 0.9], [90, 26, 74, '#efe2c8', '#a9b89a', 1.05], [55, 38, 66, '#efe2c8', G.terra, 0.9]];
      return (
        <g>
          <path d="M26 4V14" stroke="#c9a46a" strokeWidth="1.3" />
          {nail(26, 4)}
          {D.map(([a, x, y]) => { const [sx, sy] = pt(a, R); return <path key={a} d={`M${sx} ${sy}Q${(sx + x) / 2} ${(sy + y) / 2 + 2} ${x} ${y}`} stroke="#c9a46a" strokeWidth="1.2" fill="none" />; })}
          {D.map(([a, x, y]) => { const [sx, sy] = pt(a, R); return <circle key={a} cx={(sx + x) / 2} cy={(sy + y) / 2 + 1} r="2.2" fill={a === 90 ? '#7fb3b0' : G.terra} stroke={INK} strokeWidth=".9" />; })}
          {D.map(([a, x, y, c, tip, s]) => <g key={a}>{feather(x, y, c, tip, s)}</g>)}
          <path d={web} stroke="#8a6a4f" strokeWidth=".8" fill="none" strokeLinejoin="round" />
          <path d={inner} stroke="#8a6a4f" strokeWidth=".8" fill="none" />
          <circle cx="26" cy={cy} r="2.4" fill="#7fb3b0" stroke={INK} strokeWidth=".9" />
          <circle cx="26" cy={cy} r={R} fill="none" stroke={INK} strokeWidth="5.4" />
          <circle cx="26" cy={cy} r={R} fill="none" stroke={G.rattan} strokeWidth="3.6" />
          <circle cx="26" cy={cy} r={R} fill="none" stroke="#b58a52" strokeWidth="3.6" strokeDasharray="1 2.4" />
          <path d="M12.5 24C14 19.5 17.5 16 22 14.6" stroke="#fff" strokeWidth="1.2" opacity=".5" fill="none" strokeLinecap="round" />
        </g>
      );
    },
  },
  rattanLamp: {
    name: 'Rattan pendant', w: 72, h: 112, where: 'wall', set: ['boho', 'cozy'],
    art: () => {
      const D = 'M8 74C8 50 20 34 36 34C52 34 64 50 64 74Z';
      return (
        <g>
          <ellipse cx="36" cy="88" rx="32" ry="20" fill={G.glow} opacity=".25" />
          <rect x="28" y="0" width="16" height="4.4" rx="1.5" fill="#5e5040" {...O} strokeWidth="1.2" />
          {cord('M36 4V34', '#5e5040', 1.4)}
          <defs><clipPath id="rattanLamp-weave"><path d={D} /></clipPath></defs>
          <path d={D} fill={G.rattan} />
          <g clipPath="url(#rattanLamp-weave)" stroke="#b58a52" strokeWidth="1.3" fill="none">
            {Array.from({ length: 16 }, (_, i) => <path key={'a' + i} d={`M${-20 + i * 7} 80L${20 + i * 7} 30`} />)}
            {Array.from({ length: 16 }, (_, i) => <path key={'b' + i} d={`M${-20 + i * 7} 30L${20 + i * 7} 80`} />)}
          </g>
          <path d="M50 40C58 47 62 58 62.6 72H52C54 60 53 49 50 40Z" {...SH} />
          <path d={D} fill="none" {...O} />
          <path d="M14 60C15 52 19 45 25 40.5" stroke="#fff" strokeWidth="1.6" opacity=".5" fill="none" strokeLinecap="round" />
          <rect x="31" y="31" width="10" height="5.4" rx="2" fill="#8a6a4f" {...O} />
          <ellipse cx="36" cy="74" rx="28" ry="4.6" fill="#5e4636" {...O} />
          <circle cx="36" cy="75.6" r="5" fill={G.glow} {...O} strokeWidth="1.3" />
          <circle cx="34.4" cy="74.4" r="1.4" fill="#fff" opacity=".7" />
        </g>
      );
    },
  },
  incense: {
    name: 'Incense', w: 48, h: 52, where: 'shelf', set: ['boho', 'witchy'],
    art: () => (
      <g>
        <path d="M34 14C30 10 36 7 33 3.5C31.5 1.6 33.5 0.4 35.5 1" stroke="#b3a797" strokeWidth="1.6" opacity=".85" fill="none" strokeLinecap="round" />
        <path d="M35.6 14.6C39 12 37.6 9 40.4 7" stroke="#b3a797" strokeWidth="1.3" opacity=".7" fill="none" strokeLinecap="round" />
        <circle cx="34.6" cy="16.6" r="3.6" fill={G.glow} opacity=".35" />
        {cord('M16 44L24.6 32.6', '#8a5a3a', 1)}
        {cord('M24.6 32.6L34 20', '#a0603a', 1.6)}
        <circle cx="34.4" cy="19.6" r="1.4" fill="#f3784a" stroke={INK} strokeWidth=".8" />
        <path d="M6 46C7 50 13 52 24 52C35 52 41 50 42 46Z" fill="#c97a52" {...O} />
        <path d="M33 48C37 48 40 47.4 41.4 46.4C40.4 49.6 36.6 51.2 30 51.6C32.4 50.4 33.4 49.4 33 48Z" {...SH} />
        <ellipse cx="24" cy="46" rx="18" ry="3.4" fill="#d98c5f" {...O} />
        <circle cx="16" cy="44.6" r="2.4" fill={G.gold} {...O} strokeWidth="1.1" />
        {[[26, 46], [29, 45.4], [31.4, 46.4]].map(([x, y]) => <circle key={x} cx={x} cy={y} r=".8" fill="#8f8a84" />)}
        <path d="M9 47.6C11 49 14 49.8 17 50" stroke="#fff" strokeWidth="1.3" opacity=".5" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  tapestry: {
    name: 'Woven wall hanging', w: 72, h: 104, where: 'wall', set: ['boho'],
    art: () => {
      const F = 'M10 13H62V82Q36 86 10 82Z';
      const zig = (y, h, n, x0 = 10, x1 = 62) => Array.from({ length: n + 1 }, (_, i) => `${i ? 'L' : 'M'}${x0 + ((x1 - x0) * i) / n} ${y + (i % 2 ? -h : 0)}`).join('');
      return (
        <g>
          <path d="M8 11L36 2L64 11" stroke="#8a6a4f" strokeWidth="1.1" fill="none" />
          {nail(36, 2)}
          {Array.from({ length: 13 }, (_, i) => { const x = 13 + i * 3.8, y = 82.4 + Math.sin((i / 12) * Math.PI) * 3.6; return <g key={i}>{cord(`M${x} ${y - 2}L${x + (i % 2 ? 0.6 : -0.6)} ${y + 12 - Math.abs(i - 6) * 0.5}`, '#efe2c8', 1.6)}</g>; })}
          <defs><clipPath id="tapestry-cloth"><path d={F} /></clipPath></defs>
          <path d={F} fill="#f1e6d0" />
          <g clipPath="url(#tapestry-cloth)">
            <rect x="0" y="17" width="72" height="6" fill="#c96f4a" />
            <path d={zig(34, 6, 10)} stroke="#d9a93f" strokeWidth="3.4" fill="none" strokeLinejoin="round" />
            <rect x="0" y="42" width="72" height="5" fill="#a9b89a" />
            {Array.from({ length: 5 }, (_, i) => <path key={i} d={tp('M0 -6L6 0L0 6L-6 0Z', 15.2 + i * 10.4, 57)} fill={i % 2 ? '#d9a93f' : '#c96f4a'} stroke={INK} strokeWidth=".8" strokeLinejoin="round" />)}
            {Array.from({ length: 5 }, (_, i) => <circle key={i} cx={15.2 + i * 10.4} cy="57" r="1.4" fill="#f1e6d0" />)}
            <rect x="0" y="67" width="72" height="4" fill="#d9a93f" />
            <path d={zig(78, 3.4, 16)} stroke="#c96f4a" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
            {Array.from({ length: 13 }, (_, i) => <path key={'w' + i} d={`M${13 + i * 3.9} 14V84`} stroke="#d9c8a8" strokeWidth=".7" strokeDasharray="1.4 1.6" />)}
            <path d="M52 13H62V84H50C53 64 54 34 52 13Z" {...SH} />
          </g>
          <path d={F} fill="none" {...O} />
          <rect x="3" y="9" width="66" height="5" rx="2.5" fill={G.wood} {...O} />
          <circle cx="4.5" cy="11.5" r="2.6" fill="#8a6a4f" {...O} strokeWidth="1.2" />
          <circle cx="67.5" cy="11.5" r="2.6" fill="#8a6a4f" {...O} strokeWidth="1.2" />
          <rect x="8" y="10" width="20" height="1.3" rx=".65" {...HL} />
        </g>
      );
    },
  },
  floorCushion: {
    name: 'Floor cushion', w: 92, h: 46, where: 'floor', set: ['boho', 'cozy'], fab: true,
    art: ({ tint } = {}) => { const k = tint && rp(tint); return (
      <g>
        <path d="M6 22C5 30 6 38 10 41C28 45 64 45 82 41C86 38 87 30 86 22Z" fill={k ? k.d : '#c96f4a'} {...O} />
        {Array.from({ length: 8 }, (_, i) => <path key={i} d={tp('M0 -4.4L4.4 0L0 4.4L-4.4 0Z', 15 + i * 9, 34.6)} fill={i % 2 ? '#f1e6d0' : '#d9a93f'} stroke={INK} strokeWidth=".9" strokeLinejoin="round" />)}
        <path d="M8 28C28 31.6 64 31.6 84 28" stroke="#f1e6d0" strokeWidth="1.4" strokeDasharray="2.4 2" fill="none" strokeLinecap="round" />
        <path d="M70 31C77 30.6 82 29.4 85.6 27.6C85.6 33 84.6 38 81.6 40.6C77 41.8 72.6 42.4 68 42.8C70.6 39 71.4 35 70 31Z" {...SH} />
        <path d="M6 22C8 12 26 8 46 8C66 8 84 12 86 22C80 28 64 30 46 30C28 30 12 28 6 22Z" fill={k ? k.b : '#d98c5f'} {...O} />
        <path d="M46 19L30 13.4M46 19L62 13.4M46 19L30 25.4M46 19L62 25.4M46 19L22 19M46 19L70 19" stroke={k ? k.dd : '#b8643f'} strokeWidth="1" opacity=".6" strokeLinecap="round" />
        <circle cx="46" cy="19" r="2.6" fill="#d9a93f" stroke={INK} strokeWidth="1" />
        <path d="M14 18C17 13.6 24 11.4 32 10.6" stroke="#fff" strokeWidth="1.6" opacity=".45" fill="none" strokeLinecap="round" />
        {[5.4, 86.6].map((x) => (
          <g key={x}>
            <path d={`M${x - 2} 26.6L${x - 3.4} 37Q${x} 38.6 ${x + 3.4} 37L${x + 2} 26.6Z`} fill="#d9a93f" {...O} strokeWidth="1.2" />
            <path d={`M${x - 1} 29V36.6M${x + 1} 29V36.6`} stroke="#b8862e" strokeWidth=".8" />
            <circle cx={x} cy="25.4" r="2" fill="#d9a93f" stroke={INK} strokeWidth="1.1" />
          </g>
        ))}
      </g>
    ); },
  },
  sageDish: {
    name: 'Sage bundle', w: 54, h: 32, where: 'shelf', set: ['boho', 'witchy'],
    art: () => {
      const B = 'M0 -3.2C8 -5.2 22 -6.6 30 -4.6C33.4 -3.6 33.4 3.6 30 4.6C22 6.6 8 5.2 0 3.2C-1.2 1.6 -1.2 -1.6 0 -3.2Z';
      const at = (d) => tp(d, 12, 22, 1, -16);
      return (
        <g>
          <path d="M44 9C40 6 45 3.6 42.6 0.8" stroke="#b3a797" strokeWidth="1.4" opacity=".8" fill="none" strokeLinecap="round" />
          <path d="M4 22C6 28 14 31 27 31C40 31 48 28 50 22Z" fill="#a9c2c4" {...O} />
          <path d="M38 25C43 25 47 24 49 22.6C47.4 27 43 29.6 34 30.6C37 28.6 38.4 27 38 25Z" {...SH} />
          <ellipse cx="27" cy="22" rx="23" ry="5" fill="#d8e4df" {...O} />
          <path d="M12 21.4C16 19.4 22 23.6 27 21.4C31 19.6 36 22.6 40 21.4" stroke="#c9b8d8" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d={at('M-1.6 -2L-5 -2.6M-1.6 0L-5.4 0M-1.6 2L-5 2.6')} stroke="#8a7a52" strokeWidth="1.2" strokeLinecap="round" />
          {[[9, -4, -24, '#a3b392'], [16, -5, -18, '#c3cdb4'], [23, -5.2, -14, '#a3b392'], [12, 4.4, 20, '#c3cdb4'], [20, 5, 16, '#a3b392']].map(([x, y, r, c]) => (
            <path key={x + '' + y} d={at(tp('M-4 0C-4 -2.2 4 -2.2 4 0C4 2.2 -4 2.2 -4 0Z', x, y, 1, r))} fill={c} stroke={INK} strokeWidth="1.1" />
          ))}
          <path d={at(B)} fill="#b9c4a8" {...O} />
          <path d={at('M6 -2C9 -4 12 -2 14 -3.6M10 1.8C13 0 16 2.4 19 0.4M17 -3C20 -5 23 -2.6 26 -4.2M22 2.6C24.6 1 27 3 29.6 1.6')} stroke="#8f9a7f" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d={at('M4 -3.6L8 3.8M10 -4.4L14 4.2M16 -4.8L20 4.6M22 -5L26 4.8')} stroke="#c9605a" strokeWidth="1.1" strokeLinecap="round" />
          <path d={at('M30 -4.6C33.4 -3.6 33.4 3.6 30 4.6C31.2 2 31.2 -2 30 -4.6Z')} fill="#5e4636" />
          <circle cx="44.2" cy="11.6" r="1.1" fill="#f3784a" />
          <path d={at('M3 -1.6C8 -3 14 -3.2 18 -3')} stroke="#fff" strokeWidth="1.2" opacity=".5" fill="none" strokeLinecap="round" />
        </g>
      );
    },
  },

  // ---------- Minimal ----------
  ceramicVase: {
    name: 'Ceramic vase', w: 30, h: 56, where: 'shelf', set: ['minimal'],
    art: () => (
      <g>
        {cord('M15 25C15 18 17.5 12 21 6', '#8a6a4f', 1)}
        {[[15.6, 19, -165], [16.2, 16, -15], [17.8, 11.5, -160], [19, 9.5, -20], [20.4, 7.5, -60]].map(([x, y, a]) => <g key={y}>{leaf(x, y, 0.38, a, '#a9b89a')}</g>)}
        <path d="M11 24H19V32C27 37 28 46 26 51C25 54.5 22 56 15 56C8 56 5 54.5 4 51C2 46 3 37 11 32Z" fill="#f3eee6" {...O} />
        <path d="M20 34C25 38 26 46 24.5 51C23.5 54 21 55 17 55.2C22 52 23 42 20 34Z" {...SH} />
        <rect x="9.5" y="22" width="11" height="3.4" rx="1.7" fill="#f3eee6" {...O} />
        <path d="M7 40C6.5 44 7 48 8 50" stroke="#fff" strokeWidth="1.8" opacity=".9" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  clock: {
    name: 'Wall clock', w: 56, h: 60, where: 'wall', set: ['minimal', 'cozy'],
    art: () => (
      <g>
        <path d="M21 11L28 3L35 11" stroke="#8a7a62" strokeWidth="1.2" fill="none" />
        {nail(28, 3)}
        <circle cx="28" cy="34" r="24" fill={G.wood} {...O} />
        <circle cx="28" cy="34" r="19" fill={G.cream} {...O} />
        <path d="M40 21C46 29 45 41 38 48C41 40 42 29 40 21Z" {...SH} />
        {Array.from({ length: 12 }, (_, i) => {
          const t = (i / 12) * Math.PI * 2, r1 = i % 3 ? 16 : 14.5;
          return <path key={i} d={`M${28 + r1 * Math.cos(t)} ${34 + r1 * Math.sin(t)}L${28 + 17 * Math.cos(t)} ${34 + 17 * Math.sin(t)}`} stroke={INK} strokeWidth={i % 3 ? 1 : 1.6} strokeLinecap="round" />;
        })}
        <path d="M28 34L20.2 29.5M28 34L34.5 22.7" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="28" cy="34" r="1.8" fill={G.gold} stroke={INK} strokeWidth=".9" />
        <path d="M11 30C12 23 16 18 22 15.5" stroke="#fff" strokeWidth="1.8" opacity=".55" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  smallFrame: {
    name: 'Small art print', w: 36, h: 44, where: 'shelf', set: ['minimal'],
    art: () => (
      <g>
        <rect x="3" y="3" width="30" height="41" rx="1.5" fill="#2f2a26" {...O} />
        <rect x="6" y="6" width="24" height="35" fill={G.cream} />
        <path d="M10 37V27C10 19 21 19 21 27V37Z" fill={G.terra} />
        <circle cx="24" cy="14.5" r="4" fill="#a9b89a" />
        <path d="M8.5 37H27.5" stroke={INK} strokeWidth="1" strokeLinecap="round" />
        <path d="M17 31C20 29 24 31 26 29" stroke={INK} strokeWidth=".9" fill="none" strokeLinecap="round" />
        <rect x="5" y="4.4" width="12" height="1" rx=".5" fill="#fff" opacity=".3" />
      </g>
    ),
  },
  bookends: {
    name: 'Bookends', w: 70, h: 46, where: 'shelf', set: ['minimal', 'cozy'],
    art: () => (
      <g>
        {[[16, 7, 34, '#8a9a6c'], [23, 9, 38, '#c9b49a'], [32, 6, 30, '#6e819c'], [38, 8, 36, '#d9a68a'], [46, 8, 32, '#3f4a5c']].map(([x, w, h, c]) => (
          <g key={x}>
            <rect x={x} y={46 - h} width={w} height={h} rx="1.5" fill={c} {...O} />
            <path d={`M${x + 1.2} ${50 - h}H${x + w - 1.2}M${x + 1.2} ${42}H${x + w - 1.2}`} stroke="#fff" strokeWidth="1" opacity=".45" />
            <rect x={x + w * 0.62} y={47 - h} width={w * 0.3} height={h - 2} {...SH} />
          </g>
        ))}
        <path d="M2 46V30C2 22 8 16 16 16V46Z" fill="#e9dcc6" {...O} />
        <path d="M68 46V30C68 22 62 16 54 16V46Z" fill="#e9dcc6" {...O} />
        <path d="M64 25C66.5 28 67 31 67 34V45H63V30C63 28 63.5 26.5 64 25Z" {...SH} />
        <path d="M5 30C5 25 8 21 12 19.5" stroke="#fff" strokeWidth="1.8" opacity=".75" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  mug: {
    name: 'Stoneware mug', w: 34, h: 32, where: 'shelf', set: ['minimal', 'cozy'],
    art: () => (
      <g>
        <path d="M11 7C8 4.5 13 3 10 0.5M18 7C15 4.5 20 3 17 0.5" stroke="#b3a797" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {cord('M25 14C33 13 33.5 25 25 24', '#d9cbb6', 2.6)}
        <path d="M4 9H26V28C26 30.5 24.5 32 22 32H8C5.5 32 4 30.5 4 28Z" fill="#d9cbb6" {...O} />
        <path d="M4.8 10H25.2V16C22 18 18 15 15 17C11.5 19 8 15.4 4.8 17Z" fill="#7f9a8f" />
        <path d="M20 18C22 17 24 17 25.2 16V28C25.2 30 24 31.2 22 31.2H19C21 27 21 22 20 18Z" {...SH} />
        {[[8, 22], [12, 27], [17, 21], [10, 29.5], [21, 25], [14, 24]].map(([x, y]) => <circle key={x + '' + y} cx={x} cy={y} r=".65" fill="#8a7a62" />)}
        <ellipse cx="15" cy="9" rx="11" ry="2" fill="#5e4636" {...O} />
        <rect x="6.5" y="12" width="1.6" height="12" rx=".8" {...HL} />
      </g>
    ),
  },

  stones: {
    name: 'Stacked stones', w: 36, h: 44, where: 'shelf', set: ['minimal', 'boho'],
    art: () => (
      <g>
        {[[18, 38, 15, 6, '#b8b2a8'], [17, 28, 12, 5, '#d9d2c6'], [19, 19.4, 9, 4.2, '#8f8a84'], [18, 12.4, 6, 3.2, '#c9c2b4']].map(([cx, cy, rx, ry, c]) => (
          <g key={cy}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={c} {...O} />
            <path d={`M${cx} ${cy + ry}A${rx} ${ry} 0 0 0 ${cx + rx} ${cy}A${rx * 0.8} ${ry * 0.7} 0 0 1 ${cx} ${cy + ry}Z`} {...SH} />
            <ellipse cx={cx - rx * 0.45} cy={cy - ry * 0.4} rx={rx * 0.22} ry={ry * 0.2} {...HL} />
          </g>
        ))}
        {[[11, 39], [24, 36.5], [15, 29], [21, 20.6]].map(([x, y]) => <circle key={x + '' + y} cx={x} cy={y} r=".6" fill={INK} opacity=".35" />)}
      </g>
    ),
  },
  budVase: {
    name: 'Bud vase', w: 24, h: 50, where: 'shelf', set: ['minimal', 'coquette'],
    art: () => (
      <g>
        {cord('M11 26C11 18 12 12 13.5 7', '#6f9a5c', 1.1)}
        <path d="M11.4 19C14 15 18 14 20 10.5C16 11 12.8 13.6 11.4 19Z" fill={G.leaf} {...O} strokeWidth="1.3" />
        <path d="M12.4 17.4C14.6 14.6 17 13.2 18.8 11.6" stroke={INK} strokeWidth=".8" opacity=".3" fill="none" strokeLinecap="round" />
        <circle cx="13.6" cy="6.6" r="5" fill="#f2c9a8" {...O} />
        <path d="M11.2 7.2C11.4 4.6 15.4 4.4 15.8 6.8C16 8.6 13.6 9.2 12.8 7.6" stroke="#d9a07a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="11.6" cy="4.6" r=".9" {...HL} />
        <path d="M7.5 50H16.5C20.5 50 21.5 44 20.5 38.5C19.5 33.5 14 32.5 14 28.5V24H10V28.5C10 32.5 4.5 33.5 3.5 38.5C2.5 44 3.5 50 7.5 50Z" fill="#e9e4dc" {...O} />
        <path d="M15.5 33C19 35.5 20.4 40 19.6 45C19.2 47.6 18 49 16.4 49.2C18 45 17.8 38 15.5 33Z" {...SH} />
        <rect x="9" y="22.5" width="6" height="3" rx="1.5" fill="#e9e4dc" {...O} strokeWidth="1.3" />
        <path d="M6.2 38C5.8 41 6 44 6.8 46" stroke="#fff" strokeWidth="1.6" opacity=".9" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  pillarCandle: {
    name: 'Pillar candle', w: 34, h: 52, where: 'shelf', set: ['minimal', 'cozy'], wax: true,
    art: ({ wax } = {}) => { const k = waxSet(wax); return (
      <g>
        <ellipse cx="17" cy="48.8" rx="15.5" ry="3.2" fill="#d9cbb6" {...O} />
        <rect x="6" y="18" width="22" height="30" rx="3" fill={k ? k.body : '#f6f1e7'} {...O} />
        <rect x="21" y="19.5" width="6" height="27" rx="2.4" {...(k ? { fill: k.shade } : SH)} />
        <rect x="8.6" y="24" width="1.8" height="16" rx=".9" {...(k ? { fill: k.hl, opacity: 0.8 } : HL)} />
        <ellipse cx="17" cy="20" rx="9.4" ry="2.2" fill={k ? k.top : '#ebe2cf'} stroke={INK} strokeWidth=".9" opacity=".9" />
        <path d="M24.6 19.4C25.6 21 25.8 23.4 25 25.4C24.4 27 26.4 27.4 26.6 25.6C27 23.4 27 20.6 26.4 19Z" fill={k ? k.drip : '#fbf8f2'} stroke={INK} strokeWidth=".9" strokeLinejoin="round" />
        <path d="M17 20V16" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
        {flame(17, 16)}
      </g>
    ); },
  },
  notebookStack: {
    name: 'Linen notebooks', w: 54, h: 32, where: 'shelf', set: ['minimal', 'cozy'],
    art: () => (
      <g>
        {[[3, 23, 48, 9, '#d9cbb6'], [6, 15, 44, 8, '#a9b89a'], [4, 7, 46, 8, '#e9dcc6']].map(([x, y, w, h, c], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="2" fill={c} {...O} />
            <rect x={x + 6} y={y + 1.6} width={w - 7.4} height={h - 3.2} rx=".8" fill="#fffaf1" stroke={INK} strokeWidth=".9" />
            <path d={`M${x + 7.5} ${y + h / 2}H${x + w - 2.5}`} stroke="#e3d4b8" strokeWidth=".8" />
            <path d={`M${x + 1.5} ${y + 2.4}H${x + 4.6}M${x + 1.5} ${y + 4.4}H${x + 4.6}M${x + 1.5} ${y + 6.4}H${x + 4.6}`} stroke={INK} strokeWidth=".6" opacity=".25" />
            {i === 1 && <rect x={x + w - 9} y={y - 0.4} width="2" height={h + 0.8} fill="#5e5040" />}
            {i === 2 && <path d={`M${x + w - 14} ${y + h}V${y + h + 3.4}L${x + w - 12.6} ${y + h + 2.4}L${x + w - 11.2} ${y + h + 3.4}V${y + h}`} fill={G.rose} stroke={INK} strokeWidth=".8" strokeLinejoin="round" />}
          </g>
        ))}
        <rect x="11" y="3.4" width="30" height="3.4" rx="1.7" fill="#3f4a5c" {...O} strokeWidth="1.3" />
        <path d="M41 3.4L45.6 5.1L41 6.8Z" fill="#e3d4b8" {...O} strokeWidth="1.1" />
        <rect x="14" y="2.2" width="8" height="1.6" rx=".8" fill={G.gold} stroke={INK} strokeWidth=".8" />
      </g>
    ),
  },
  roundMirror: {
    name: 'Round mirror', w: 60, h: 72, where: 'wall', set: ['minimal', 'boho'],
    art: () => (
      <g>
        <path d="M27.5 4V20H32.5V4Z" fill="#8a5a3a" {...O} strokeWidth="1.3" />
        <path d="M28.8 7V18" stroke="#c98a5a" strokeWidth=".8" strokeDasharray="1.2 1.4" />
        {nail(30, 4)}
        <circle cx="30" cy="44" r="25" fill="#c99a6a" {...O} />
        <circle cx="30" cy="44" r="21.5" fill="#dbe7fa" {...O} />
        <path d="M43 28C50 37 49 52 41 60C45 50 46 38 43 28Z" fill="#9fb4d6" opacity=".45" />
        <path d="M17 46L30 29M20 55L38 33" stroke="#fff" strokeWidth="2.6" opacity=".7" strokeLinecap="round" />
        <path d="M9 36C10.5 30 14.5 25 20 22" stroke="#fff" strokeWidth="1.4" opacity=".45" fill="none" strokeLinecap="round" />
        <rect x="26.5" y="17" width="7" height="5" rx="1.5" fill="#8a5a3a" {...O} strokeWidth="1.2" />
        <circle cx="30" cy="19.5" r=".9" fill={G.gold} />
      </g>
    ),
  },
  plinthBowl: {
    name: 'Plinth & bowl', w: 42, h: 46, where: 'shelf', set: ['minimal'],
    art: () => (
      <g>
        <rect x="8" y="25" width="26" height="21" rx="1.5" fill="#c99a6a" {...O} />
        <rect x="27.5" y="26" width="5.6" height="19" rx="1" {...SH} />
        <path d="M11 31C15 32 17 30 21 31.5M12 38C16 36.5 19 39 24 37.5M14 43C17 42 20 43.5 22 42.5" stroke="#a87c52" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M5 15C6 23 12 26 21 26C30 26 36 23 37 15Z" fill="#f3eee6" {...O} />
        <path d="M29 17H36.4C35.4 22 31.4 25 25 25.6C28.6 23 29.6 20 29 17Z" {...SH} />
        <ellipse cx="21" cy="15" rx="16" ry="3.6" fill="#e3dccf" {...O} />
        <ellipse cx="17" cy="13.6" rx="3.4" ry="2.4" fill="#8f8a84" {...O} strokeWidth="1.2" />
        <ellipse cx="24.4" cy="13.8" rx="2.6" ry="1.9" fill="#c9c2b4" {...O} strokeWidth="1.2" />
        {[[11, 20], [16, 22.6], [24, 21.4], [30, 20.6], [13, 23.6]].map(([x, y]) => <circle key={x + '' + y} cx={x} cy={y} r=".6" fill="#8a7a62" />)}
        <path d="M8.4 18.4C9.4 20.6 11 22 13 23" stroke="#fff" strokeWidth="1.5" opacity=".85" fill="none" strokeLinecap="round" />
      </g>
    ),
  },

  // ---------- Cozy / general ----------
  fairyLights: {
    name: 'Fairy lights', w: 220, h: 50, where: 'wall', set: ['cozy', 'coquette', 'boho'], lights: true,
    art: ({ light } = {}) => (
      <g>
        {wire()}
        {swagPts([0.12, 0.37, 0.62, 0.87]).map(([x, y], i) => {
          const c = lightCol(light, i);
          return (
            <g key={i}>
              <circle cx={x} cy={y + 7} r="8" fill={c} opacity=".28" />
              <ellipse cx={x} cy={y + 7} rx="3.2" ry="4.4" fill={c} {...O} strokeWidth="1.2" />
              <rect x={x - 2} y={y} width="4" height="3.2" rx="1" fill="#5e5040" />
              <circle cx={x - 1} cy={y + 6} r=".9" fill="#fff" opacity=".8" />
            </g>
          );
        })}
      </g>
    ),
  },
  starLights: {
    name: 'Star lights', w: 220, h: 50, where: 'wall', set: ['cozy', 'witchy', 'boho'], lights: true,
    art: ({ light } = {}) => (
      <g>
        {wire()}
        {swagPts([0.1, 0.3, 0.5, 0.7, 0.9]).map(([x, y], i) => {
          const c = lightCol(light, i);
          return (
            <g key={i}>
              <circle cx={x} cy={y + 8.4} r="8.6" fill={c} opacity=".26" />
              <rect x={x - 1.8} y={y} width="3.6" height="3" rx="1" fill="#5e5040" />
              <path d={star5(x, y + 8.6, 5.6)} fill={c} {...O} strokeWidth="1.1" />
              <circle cx={x - 1.2} cy={y + 7.4} r=".9" fill="#fff" opacity=".85" />
            </g>
          );
        })}
      </g>
    ),
  },
  heartLights: {
    name: 'Heart lights', w: 220, h: 50, where: 'wall', set: ['cozy', 'coquette'], lights: true,
    art: ({ light } = {}) => (
      <g>
        {wire()}
        {swagPts([0.12, 0.37, 0.62, 0.87]).map(([x, y], i) => {
          const c = lightCol(light, i);
          return (
            <g key={i}>
              <circle cx={x} cy={y + 8} r="8.6" fill={c} opacity=".26" />
              <rect x={x - 1.8} y={y} width="3.6" height="3" rx="1" fill="#5e5040" />
              <path d={tp(HEART, x, y + 7.6, 0.44)} fill={c} {...O} strokeWidth="1.1" />
              <circle cx={x - 2.4} cy={y + 6.4} r=".9" fill="#fff" opacity=".85" />
            </g>
          );
        })}
      </g>
    ),
  },
  lanternLights: {
    name: 'Lantern lights', w: 220, h: 50, where: 'wall', set: ['cozy', 'boho', 'plant'], lights: true,
    art: ({ light } = {}) => (
      <g>
        {wire()}
        {swagPts([0.12, 0.37, 0.62, 0.87]).map(([x, y], i) => {
          const c = lightCol(light, i), rib = mix(c, '#000000', 0.2), cy = y + 12;
          return (
            <g key={i}>
              <circle cx={x} cy={cy} r="11" fill={c} opacity=".24" />
              <path d={`M${x} ${y}V${y + 5}`} stroke="#5e5040" strokeWidth="1" />
              <ellipse cx={x} cy={cy} rx="6" ry="6.8" fill={c} {...O} strokeWidth="1.2" />
              <path d={`M${x} ${cy - 6.6}V${cy + 6.6}M${x - 3.4} ${cy - 5.6}Q${x - 5} ${cy} ${x - 3.4} ${cy + 5.6}M${x + 3.4} ${cy - 5.6}Q${x + 5} ${cy} ${x + 3.4} ${cy + 5.6}`} stroke={rib} strokeWidth=".9" fill="none" />
              <rect x={x - 3} y={cy - 8} width="6" height="2.6" rx="1" fill="#5e5040" {...O} strokeWidth=".9" />
              <rect x={x - 2.4} y={cy + 5.6} width="4.8" height="2.4" rx="1" fill="#5e5040" {...O} strokeWidth=".9" />
              <path d={`M${x} ${cy + 8}V${cy + 11.4}`} stroke={rib} strokeWidth="1.2" strokeLinecap="round" />
              <path d={`M${x - 3.6} ${cy - 2}Q${x - 3.8} ${cy - 4} ${x - 2.4} ${cy - 5}`} stroke="#fff" strokeWidth="1.1" opacity=".75" fill="none" strokeLinecap="round" />
            </g>
          );
        })}
      </g>
    ),
  },
  curtainLights: {
    name: 'Curtain lights', w: 180, h: 120, where: 'wall', set: ['cozy', 'minimal'], lights: true,
    art: ({ light } = {}) => {
      const A = [4, 8], B = [90, 18], C = [176, 8];
      const S = Array.from({ length: 13 }, (_, i) => {
        const t = 0.05 + i * 0.075, [x, y] = qpt(A, B, C, t);
        const n = Math.floor((112 - y - ((i * 3) % 5) * 8 - 4) / 11);
        return { x, y, n, len: 9 + (n - 1) * 11 + 4 };
      });
      return (
        <g>
          {S.map(({ x, y, len }, i) => <path key={'w' + i} d={`M${x} ${y}Q${x + (i % 2 ? 1.6 : -1.6)} ${y + len / 2} ${x} ${y + len}`} stroke="#5e5040" strokeWidth=".9" fill="none" />)}
          {S.map(({ x, y, n, len }, i) => Array.from({ length: n }, (_, j) => {
            const by = y + 9 + j * 11, c = lightCol(light, i * 2 + j), bx = x + (i % 2 ? 1 : -1) * Math.sin(((by - y) / len) * Math.PI) * 0.8;
            return (
              <g key={i + '-' + j}>
                <circle cx={bx} cy={by} r="5" fill={c} opacity=".24" />
                <ellipse cx={bx} cy={by} rx="2.2" ry="3" fill={c} stroke={INK} strokeWidth="1" />
                <circle cx={bx - 0.7} cy={by - 0.9} r=".6" fill="#fff" opacity=".85" />
              </g>
            );
          }))}
          <path d="M4 8Q90 18 176 8" stroke="#5e5040" strokeWidth="1.4" fill="none" />
          {nail(4, 8)}
          {nail(176, 8)}
        </g>
      );
    },
  },
  tableLamp: {
    name: 'Table lamp', w: 50, h: 80, where: 'shelf', set: ['cozy', 'minimal'],
    art: () => (
      <g>
        <ellipse cx="25" cy="44" rx="23" ry="12" fill={G.glow} opacity=".25" />
        <rect x="23" y="38" width="4" height="11" fill={G.gold} {...O} />
        <path d="M18 48H32C40 52 42 66 36 74H14C8 66 10 52 18 48Z" fill="#7f9a8f" {...O} />
        <path d="M31 51C37 56 38 66 34 73H29C33 66 33 57 31 51Z" {...SH} />
        <path d="M14 58C14 55 15.5 52.5 17.5 51" stroke="#fff" strokeWidth="1.8" opacity=".55" fill="none" strokeLinecap="round" />
        <rect x="15" y="73.6" width="20" height="6.4" rx="2" fill={G.wood} {...O} />
        <path d="M14 8H36L44 38Q44 40 42 40H8Q6 40 6 38Z" fill="#f6ead4" {...O} />
        <path d="M18 9L14 39M25 9V39M32 9L36 39" stroke="#e3d4b8" strokeWidth="1.1" />
        <path d="M7.5 36H42.5" stroke={G.glow} strokeWidth="2.4" opacity=".8" />
        <path d="M35 9L42.6 37.4H37.5L32.6 9Z" {...SH} />
      </g>
    ),
  },
  floorLamp: {
    name: 'Floor lamp', w: 70, h: 200, where: 'floor', set: ['cozy', 'minimal', 'boho'],
    art: () => (
      <g>
        <ellipse cx="35" cy="56" rx="32" ry="18" fill={G.glow} opacity=".22" />
        {cord('M35 118L37 192', '#8a6a4f', 3)}
        {cord('M35 52V120', G.gold, 2.6)}
        {cord('M35 118L8 197M35 118L62 197', G.wood, 3.4)}
        <circle cx="35" cy="119" r="3.6" fill={G.gold} {...O} />
        <path d="M44 52V64" stroke={INK} strokeWidth="1" />
        <circle cx="44" cy="65.5" r="1.8" fill={G.gold} {...O} strokeWidth="1" />
        <path d="M16 10H54L62 50Q62 52 60 52H10Q8 52 8 50Z" fill="#f6ead4" {...O} />
        <path d="M24 11L20 51M35 11V51M46 11L50 51" stroke="#e3d4b8" strokeWidth="1.1" />
        <path d="M9.5 48H60.5" stroke={G.glow} strokeWidth="2.6" opacity=".8" />
        <path d="M53 11L60.6 49.4H54L50.5 11Z" {...SH} />
      </g>
    ),
  },
  picture: {
    name: 'Framed picture', w: 80, h: 70, where: 'wall', set: ['cozy', 'minimal'],
    art: () => (
      <g>
        <path d="M14 16L40 4L66 16" stroke="#8a7a62" strokeWidth="1.2" fill="none" />
        {nail(40, 4)}
        <rect x="6" y="14" width="68" height="54" rx="2" fill="#b98a5e" {...O} />
        <rect x="11" y="19" width="58" height="44" fill={G.cream} {...O} strokeWidth="1" />
        <rect x="15" y="23" width="50" height="36" fill="#dbe7fa" />
        <circle cx="53" cy="32" r="5" fill="#f3d98a" />
        <path d="M15 49C26 40 36 42 44 47C52 41 60 42 65 45V59H15Z" fill="#a9b89a" />
        <path d="M15 55C30 49 50 53 65 51V59H15Z" fill="#86b06f" />
        <path d="M25 52V46" stroke="#8a6a4f" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="25" cy="44" r="3.4" fill="#6f9a5c" />
        <rect x="15" y="23" width="50" height="36" fill="none" stroke={INK} strokeWidth="1" />
        <rect x="8" y="15.6" width="24" height="1.4" rx=".7" {...HL} />
      </g>
    ),
  },
  catBed: {
    name: 'Cat bed', w: 110, h: 60, where: 'floor', set: ['cozy'],
    art: () => (
      <g>
        <ellipse cx="55" cy="34" rx="52" ry="18" fill="#a9b89a" {...O} />
        <ellipse cx="55" cy="40" rx="41" ry="11" fill="#f3e6d2" {...O} />
        <ellipse cx="62" cy="37" rx="22" ry="12" fill="#e3a065" {...O} />
        <path d="M58 27C61 30 61 34 59 37M66 27C69 30 69 34 67 37M74 29C76 32 76 35 74 38" stroke="#c98444" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M31 33L32 23L38.5 28.5Z" fill="#e3a065" {...O} />
        <path d="M41.5 28.5L48 23L49 33Z" fill="#e3a065" {...O} />
        <circle cx="40" cy="37" r="10.5" fill="#e3a065" {...O} />
        <path d="M34.2 38Q36 39.8 37.8 38M42.2 38Q44 39.8 45.8 38" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M39 41H41L40 42.2Z" fill="#c96a82" />
        <circle cx="34" cy="41.5" r="1.8" fill={G.pink} opacity=".6" />
        <circle cx="46" cy="41.5" r="1.8" fill={G.pink} opacity=".6" />
        {cord('M82 41C80 50 60 50 44 47.5', '#e3a065', 4.6)}
        <path d="M3 36C3 52 28 60 55 60C82 60 107 52 107 36C100 46 80 51 55 51C30 51 10 46 3 36Z" fill="#98a888" {...O} />
        <path d="M14 47C26 53 40 55 50 55.5" stroke="#fff" strokeWidth="1.8" opacity=".4" fill="none" strokeLinecap="round" />
        <path d="M82 52C94 49 102 44 105 39C104 48 94 55 80 58Z" {...SH} />
      </g>
    ),
  },
  stool: {
    name: 'Wooden stool', w: 60, h: 70, where: 'floor', set: ['cozy', 'minimal', 'boho'],
    art: () => (
      <g>
        {cord('M30 19L30 66', '#7d5e43', 3.4)}
        {cord('M9 50H51', '#8a6a4f', 2.4)}
        {cord('M13 18L7 68M47 18L53 68', G.wood, 3.6)}
        <path d="M4 12V17Q4 21 30 21Q56 21 56 17V12Z" fill={G.wood} {...O} />
        <ellipse cx="30" cy="12" rx="26" ry="6" fill="#c99a6a" {...O} />
        <path d="M14 11C20 8.5 36 8 44 10M18 14C26 15.5 38 15 43 13.5" stroke="#a87c52" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M44 17.6Q53 16.6 55.2 13.4V17Q54 20 44 20.4Z" {...SH} />
      </g>
    ),
  },

  // ---------- Furniture (recolourable via tint, dress-up via acc) ----------
  desk: {
    name: 'Desk', w: 210, h: 140 + TH, where: 'floor', set: ['cozy', 'minimal'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint);
      return (
        <g transform={`translate(0 ${TH})`}>
          {leg(k, 36, 16, 134, 7, 6, true)}
          {leg(k, 174, 16, 134, 7, 6, true)}
          <rect x="10" y="14" width="190" height="26" rx="2" fill={k.c} {...O} />
          <rect x="11" y="15.4" width="188" height="3" fill={k.shade} />
          {grain(k, 24, 19, 46, 19, 2)}
          {grain(k, 140, 19, 46, 19, 2)}
          {drawer(k, 72, 19, 66, 17)}
          {leg(k, 19, 15, 140, 11, 8)}
          {leg(k, 191, 15, 140, 11, 8)}
          {slab(k, 2, 4, 206, 12)}
          {cloth(acc, 2, 208, 4, 16)}
        </g>
      );
    },
  },
  vintageDesk: {
    name: 'Vintage desk', w: 200, h: 140 + TH, where: 'floor', set: ['cozy', 'coquette', 'witchy'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint, FURN_COLORS[1]);
      const CL = 'M10 19V44C4 54 4 68 10 80C15 92 18 110 17 126C16.5 131 12 134 10 137Q9.5 140 13 140H25Q27 140 26.5 137C25 132 24.5 128 24.5 122C24.5 104 25 88 28 72C30 60 33 52 34 46V19Z';
      const cab = (back) => (
        <g>
          <path d={CL} fill={back ? k.shade : k.c} {...O} />
          {!back && <path d="M30.5 54C28 62 26 72 25 84" stroke={k.shade} strokeWidth="2.4" fill="none" strokeLinecap="round" />}
          {!back && <path d="M8.4 64C8.4 58 9.4 54 11.4 50" stroke={k.hl} strokeWidth="1.4" opacity=".75" fill="none" strokeLinecap="round" />}
        </g>
      );
      const mir = (el) => <g transform="translate(200 0) scale(-1 1)">{el}</g>;
      return (
        <g transform={`translate(0 ${TH})`}>
          <g transform="translate(18 -4)">{cab(true)}</g>
          {mir(<g transform="translate(18 -4)">{cab(true)}</g>)}
          <path d="M10 18H190V46H166C158 46 152 50 140 52C128 54 114 50 100 50C86 50 72 54 60 52C48 50 42 46 34 46H10Z" fill={k.c} {...O} />
          <path d="M60 48.6C72 50.6 86 46.6 100 46.6C114 46.6 128 50.6 140 48.6" stroke={k.shade} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          {drawer(k, 42, 23, 54, 17)}
          {drawer(k, 104, 23, 54, 17)}
          {cab()}
          {mir(cab())}
          <rect x="7" y="14" width="186" height="5" rx="2" fill={k.shade} {...O} strokeWidth="1.4" />
          {slab(k, 3, 6, 194, 10, 4)}
          {cloth(acc, 3, 197, 6, 15)}
        </g>
      );
    },
  },
  sideTable: {
    name: 'Side table', w: 80, h: 95 + TH, where: 'floor', set: ['cozy', 'boho', 'minimal'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint);
      return (
        <g transform={`translate(0 ${TH})`}>
          {cord('M39 80L28 90', k.shade, 3.4)}
          {cord('M36 79Q24 84 8.5 92.2', k.c, 4.4)}
          {cord('M44 79Q56 84 71.5 92.2', k.c, 4.4)}
          <path d="M35 24H45C44 33 47 40 47 48C47 56 44 62 44 70L46 82H34L36 70C36 62 33 56 33 48C33 40 36 34 35 24Z" fill={k.c} {...O} />
          <path d="M42 26H44.4C44 34 46 40 46 48C46 56 43.4 62 43 70L44.6 80.6H42.4C41.6 70 44 60 44 48C44 40 42.6 34 42 26Z" fill={k.shade} />
          <path d="M35.6 43C35.2 47 35.6 51 36.6 54" stroke={k.hl} strokeWidth="1.3" opacity=".8" fill="none" strokeLinecap="round" />
          <ellipse cx="40" cy="70" rx="6.4" ry="2.2" fill={k.top} {...O} strokeWidth="1.3" />
          <path d="M3 12V17C3 21.5 19.6 25 40 25C60.4 25 77 21.5 77 17V12Z" fill={k.c} {...O} />
          <path d="M58 20.6C66 19.6 72 18.4 75.6 16.4V17.4C73 20 67 21.8 58 23Z" fill={k.shade} />
          <ellipse cx="40" cy="12" rx="37" ry="8" fill={k.top} {...O} />
          {k.wood && <path d="M16 10.6Q30 7.4 46 9.4M30 14.4Q45 16.2 62 13M50 7Q58 7.6 64 9" stroke={k.grain} strokeWidth=".9" opacity=".6" fill="none" strokeLinecap="round" />}
          <path d="M10 10.4C13 7.6 20 6 28 5.4" stroke={k.hl} strokeWidth="1.6" opacity=".85" fill="none" strokeLinecap="round" />
          {cloth(acc, 3, 77, 12, 18, { oval: 8, at: 0.5 })}
        </g>
      );
    },
  },
  nightstand: {
    name: 'Nightstand', w: 85, h: 100 + TH, where: 'floor', set: ['cozy', 'minimal'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint);
      return (
        <g transform={`translate(0 ${TH})`}>
          {leg(k, 14, 84, 100, 8, 6)}
          {leg(k, 71, 84, 100, 8, 6)}
          <rect x="6" y="12" width="73" height="74" rx="2" fill={k.c} {...O} />
          <rect x="74.6" y="13.4" width="3.6" height="71.4" fill={k.shade} />
          {drawer(k, 11, 17, 63, 22)}
          <rect x="11" y="44" width="63" height="36" rx="1.5" fill={k.deep} {...O} strokeWidth="1.4" />
          <rect x="11.8" y="44.8" width="61.4" height="5" fill="#000" opacity=".2" />
          <rect x="11" y="74.5" width="63" height="5.5" rx="1" fill={k.shade} {...O} strokeWidth="1.2" />
          {grain(k, 8, 81, 69, 4, 1)}
          {slab(k, 3, 5, 79, 9)}
          {cloth(acc, 3, 82, 5, 13, { at: 0.5 })}
        </g>
      );
    },
  },
  coffeeTable: {
    name: 'Coffee table', w: 200, h: 70 + TH, where: 'floor', set: ['cozy', 'minimal', 'boho'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint);
      return (
        <g transform={`translate(0 ${TH})`}>
          {leg(k, 34, 18, 66, 7, 6, true)}
          {leg(k, 166, 18, 66, 7, 6, true)}
          <rect x="10" y="18" width="180" height="10" rx="2" fill={k.shade} {...O} />
          {leg(k, 17, 18, 70, 10, 8)}
          {leg(k, 183, 18, 70, 10, 8)}
          <path d="M16 4H184Q195 4 197 11H3Q5 4 16 4Z" fill={k.top} {...O} />
          {grain(k, 20, 4, 160, 7, 1)}
          <rect x="3" y="10" width="194" height="10" rx="5" fill={k.c} {...O} />
          <rect x="10" y="12" width="56" height="1.8" rx=".9" fill={k.hl} opacity=".85" />
          <path d="M170 18.4H190Q195.4 18 196 14.6V16Q195 19.4 190 19.4H170Z" fill={k.shade} />
          {cloth(acc, 3, 197, 4, 20)}
        </g>
      );
    },
  },
  consoleTable: {
    name: 'Console table', w: 170, h: 125 + TH, where: 'floor', set: ['cozy', 'minimal', 'coquette'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint);
      return (
        <g transform={`translate(0 ${TH})`}>
          {leg(k, 26, 20, 121, 5, 4, true)}
          {leg(k, 144, 20, 121, 5, 4, true)}
          <path d="M14 92H156L160 97H10Z" fill={k.top} {...O} />
          <rect x="10" y="96" width="150" height="6" rx="1.5" fill={k.c} {...O} />
          {grain(k, 12, 96, 146, 6, 1)}
          <rect x="7" y="12" width="156" height="13" rx="2" fill={k.c} {...O} />
          <rect x="8" y="13.4" width="154" height="2.4" fill={k.shade} />
          {grain(k, 20, 15, 130, 10, 1)}
          {leg(k, 12, 12, 125, 7.4, 5)}
          {leg(k, 158, 12, 125, 7.4, 5)}
          {slab(k, 2, 4, 166, 9)}
          {cloth(acc, 2, 168, 4, 18)}
        </g>
      );
    },
  },
  chair: {
    name: 'Chair', w: 70, h: 150, where: 'floor', set: ['cozy', 'minimal'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint);
      return (
        <g>
          {leg(k, 16, 80, 144, 6, 5, true)}
          {leg(k, 54, 80, 144, 6, 5, true)}
          <rect x="18" y="116" width="34" height="3.6" rx="1.5" fill={k.deep} {...O} strokeWidth="1.2" />
          <rect x="13" y="8" width="6" height="66" rx="2" fill={k.c} {...O} />
          <rect x="51" y="8" width="6" height="66" rx="2" fill={k.c} {...O} />
          <path d="M54.6 12V72" stroke={k.shade} strokeWidth="2" strokeLinecap="round" />
          <path d="M15 36Q35 32 55 36V44Q35 40 15 44Z" fill={k.c} {...O} />
          <path d="M7 10Q35 4 63 10V21Q35 15 7 21Z" fill={k.c} {...O} />
          {k.wood && <path d="M12 14.4Q24 11 36 11.6M30 16Q44 14.6 58 16.4M20 40Q30 37.6 42 38.4" stroke={k.grain} strokeWidth=".9" opacity=".6" fill="none" strokeLinecap="round" />}
          <path d="M10 12.6Q20 9.4 30 8.6" stroke={k.hl} strokeWidth="1.5" opacity=".85" fill="none" strokeLinecap="round" />
          <path d="M12 70H58L66 78H4Z" fill={k.top} {...O} />
          {grain(k, 10, 70, 50, 8, 1)}
          <rect x="4" y="77" width="62" height="9" rx="2" fill={k.c} {...O} />
          <rect x="8" y="79" width="20" height="1.6" rx=".8" fill={k.hl} opacity=".85" />
          {leg(k, 9, 85, 150, 7, 6)}
          {leg(k, 61, 85, 150, 7, 6)}
          <rect x="12" y="124" width="46" height="4" rx="1.6" fill={k.c} {...O} strokeWidth="1.3" />
          {acc === 'witchy' && <path d={tp(MOONP, 24, 64, 10, -18)} fill="#f3d98a" {...O} />}
          {pad(acc, 7, 63, 78, 10)}
        </g>
      );
    },
  },
  armchair: {
    name: 'Armchair', w: 150, h: 130, where: 'floor', set: ['cozy', 'boho'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint, FURN_COLORS[9]), L = tintSet(DARKWOOD);
      const arm = (
        <g>
          <path d="M4 108V58C4 47 11 42 21 42C31 42 38 47 38 58V108Q38 112 34 112H8Q4 112 4 108Z" fill={k.c} {...O} />
          <path d="M33 60C36 64 36.6 70 36.6 76V108.6Q36.6 110.6 34 110.6H31C32.6 94 33.4 74 33 60Z" fill={k.shade} />
          <ellipse cx="21" cy="57" rx="11" ry="9" fill={k.top} {...O} />
          <path d="M14 53.6Q16 50 21 49.6" stroke={k.hl} strokeWidth="1.4" opacity=".85" fill="none" strokeLinecap="round" />
          <path d="M9 47.6Q13 43.8 19 43.2" stroke={k.hl} strokeWidth="1.4" opacity=".7" fill="none" strokeLinecap="round" />
        </g>
      );
      return (
        <g>
          {leg(L, 40, 108, 127, 7, 6, true)}
          {leg(L, 110, 108, 127, 7, 6, true)}
          {leg(L, 22, 108, 130, 9, 6)}
          {leg(L, 128, 108, 130, 9, 6)}
          <path d="M24 74V32C24 14 44 6 75 6C106 6 126 14 126 32V74Z" fill={k.c} {...O} />
          <path d="M52 15Q50 40 51 66M75 11V66M98 15Q100 40 99 66" stroke={k.shade} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          {[[52, 40], [75, 38], [98, 40]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.6" fill={k.deep} stroke={INK} strokeWidth=".8" />)}
          <path d="M33 26C38 16 52 11 66 10" stroke={k.hl} strokeWidth="1.6" opacity=".8" fill="none" strokeLinecap="round" />
          <rect x="14" y="80" width="122" height="31" rx="8" fill={k.c} {...O} />
          <path d="M16 100Q75 104 134 100V103Q134 109.4 128 109.4H22Q16 109.4 16 103Z" fill={k.shade} />
          <path d="M18 86H132" stroke={k.shade} strokeWidth="1.3" strokeDasharray="2.4 2" />
          <path d="M30 69Q30 63 36 63H114Q120 63 120 69V84Q75 88 30 84Z" fill={k.top} {...O} />
          <path d="M37 67H70" stroke={k.hl} strokeWidth="1.4" opacity=".85" strokeLinecap="round" />
          {pillow(acc, 75, 67, 40)}
          {arm}
          <g transform="translate(150 0) scale(-1 1)">{arm}</g>
          {throwOver(acc, 2.6, 39.4, 42, 80)}
        </g>
      );
    },
  },
  roundStool: {
    name: 'Round stool', w: 60, h: 70, where: 'floor', set: ['cozy', 'minimal', 'boho'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint);
      return (
        <g>
          {cord('M22 19L19.4 63.6M38 19L40.6 63.6', k.shade, 3.2)}
          {cord('M14 46Q30 50 46 46', k.shade, 1.8)}
          {cord('M13 19L7.2 66.6M47 19L52.8 66.6', k.c, 3.8)}
          {cord('M10 52Q30 57.6 50 52', k.c, 2.2)}
          <path d="M3 10V16Q3 22 30 22Q57 22 57 16V10Z" fill={k.c} {...O} />
          <path d="M44 19.6Q54 18.4 55.8 15.2V16.4Q55 19.6 44 21Z" fill={k.shade} />
          <ellipse cx="30" cy="10" rx="27" ry="6.5" fill={k.top} {...O} />
          {k.wood && <path d="M12 9.4Q22 6.4 36 7.4M24 12.6Q36 13.8 48 11.6" stroke={k.grain} strokeWidth=".9" opacity=".6" fill="none" strokeLinecap="round" />}
          <path d="M8 9Q11 6 18 5" stroke={k.hl} strokeWidth="1.5" opacity=".85" fill="none" strokeLinecap="round" />
          {pad(acc, 5, 55, 13, 10)}
        </g>
      );
    },
  },
  bench: {
    name: 'Bench', w: 170, h: 70, where: 'floor', set: ['cozy', 'boho', 'coquette'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint), cu = k.wood ? mix(k.c, '#f6ecdc', 0.72) : mix(k.c, '#ffffff', 0.32), cd = mix(cu, '#000000', 0.18);
      return (
        <g>
          {leg(k, 28, 40, 66, 7, 6, true)}
          {leg(k, 142, 40, 66, 7, 6, true)}
          {leg(k, 14, 40, 70, 10, 8)}
          {leg(k, 156, 40, 70, 10, 8)}
          <rect x="4" y="32" width="162" height="10" rx="3" fill={k.c} {...O} />
          {grain(k, 8, 32, 154, 10, 1)}
          <rect x="10" y="35" width="40" height="1.6" rx=".8" fill={k.hl} opacity=".8" />
          <path d="M10 33C8 26 10 18 18 18H152C160 18 162 26 160 33Q85 36 10 33Z" fill={cu} {...O} />
          <path d="M14 30.6Q85 33.4 156 30.6" stroke={cd} strokeWidth="1.2" strokeDasharray="2.4 2" fill="none" />
          {[45, 85, 125].map((x) => <g key={x}><path d={`M${x - 5} 23.4Q${x} 26.4 ${x + 5} 23.4`} stroke={cd} strokeWidth="1" fill="none" strokeLinecap="round" /><circle cx={x} cy="25" r="1.5" fill={cd} stroke={INK} strokeWidth=".8" /></g>)}
          <path d="M15 24Q16 20.4 26 20.4" stroke="#fff" strokeWidth="1.4" opacity=".55" fill="none" strokeLinecap="round" />
          {pillow(acc, 36, 24, 24)}
          {throwOver(acc, 126, 158, 18, 46, 3)}
        </g>
      );
    },
  },
  dresser: {
    name: 'Dresser', w: 190, h: 150 + TH, where: 'floor', set: ['cozy', 'coquette', 'minimal'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint);
      return (
        <g transform={`translate(0 ${TH})`}>
          {leg(k, 30, 134, 147, 7, 6, true)}
          {leg(k, 160, 134, 147, 7, 6, true)}
          {leg(k, 16, 132, 150, 10, 8)}
          {leg(k, 174, 132, 150, 10, 8)}
          <rect x="8" y="12" width="174" height="122" rx="2" fill={k.c} {...O} />
          <rect x="175.4" y="13.4" width="5" height="114" fill={k.shade} />
          {drawer(k, 14, 18, 158, 33, 'pulls')}
          {drawer(k, 14, 55, 158, 34, 'pulls')}
          {drawer(k, 14, 93, 158, 34, 'pulls')}
          <rect x="6" y="128" width="178" height="8" rx="2" fill={k.top} {...O} />
          {slab(k, 2, 4, 186, 10)}
          {cloth(acc, 2, 188, 4, 16)}
        </g>
      );
    },
  },
  wallShelf: {
    name: 'Wall shelf', w: 140, h: 60, where: 'wall', set: ['cozy', 'minimal', 'plant', 'boho'], tints: true, accs: true,
    art: ({ tint, acc } = {}) => {
      const k = tintSet(tint);
      const IRON = '#4a4542';
      const brk = (x, dir) => (
        <g>
          {cord(`M${x} 16.6V33M${x} 31Q${x} 20 ${x + dir * 15} 17`, IRON, 2.2)}
          <circle cx={x} cy="22" r=".9" fill="#8f8a84" />
          <circle cx={x} cy="29" r=".9" fill="#8f8a84" />
        </g>
      );
      const SW = [[6, 16], [70, 36], [134, 16]];
      return (
        <g>
          {brk(16, 1)}
          {brk(124, -1)}
          {acc === 'witchy' && <g>{herbs(54, 17)}{herbs(86, 17)}</g>}
          {acc === 'boho' && (
            <g>
              {Array.from({ length: 21 }, (_, i) => 30 + i * 4).map((x) => <g key={x}>{cord(`M${x} 17V${47 - Math.abs(x - 70) * 0.32}`, '#f1e6d0', 1.3)}</g>)}
              <path d={zig(30, 110, 25, 3, 8)} stroke="#c9b48c" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {[[38, 32], [54, 32], [70, 32], [86, 32], [102, 32], [46, 38], [62, 38], [78, 38], [94, 38], [70, 44]].map(([x, y]) => <ellipse key={x + '-' + y} cx={x} cy={y} rx="2.6" ry="1.9" fill="#e3d4b8" stroke={INK} strokeWidth=".9" />)}
              <circle cx="54" cy="40.6" r="2.2" fill={G.wood} {...O} strokeWidth="1.1" />
              <circle cx="86" cy="40.6" r="2.2" fill={G.wood} {...O} strokeWidth="1.1" />
              <rect x="28" y="15.4" width="84" height="3.4" rx="1.7" fill={G.wood} {...O} strokeWidth="1.2" />
            </g>
          )}
          <path d="M6 3H134L138 8.4H2Z" fill={k.top} {...O} />
          <rect x="2" y="8" width="136" height="9" rx="2" fill={k.c} {...O} />
          {grain(k, 4, 8, 132, 9, 1)}
          <rect x="7" y="10" width="40" height="1.6" rx=".8" fill={k.hl} opacity=".85" />
          <path d="M120 15.6H134Q136.6 15.6 136.6 13.4V14.4Q136.6 15.8 134 15.8Z" fill={k.shade} />
          {acc === 'minimal' && <rect x="2.4" y="6" width="135.2" height="3.4" rx="1.4" fill={k.deep} {...O} strokeWidth="1.2" />}
          {acc === 'coquette' && (
            <g>
              <path d="M6 16Q70 36 134 16" stroke={G.rose} strokeWidth="1.4" fill="none" />
              {[0.1, 0.35, 0.65, 0.9].map((t) => { const [x, y] = qpt(...SW, t); return <circle key={t} cx={x} cy={y + 0.6} r="1.9" fill="#fffaf1" stroke={INK} strokeWidth=".8" />; })}
              {[0.22, 0.5, 0.78].map((t, i) => { const [x, y] = qpt(...SW, t); return <g key={t}>{i % 2 ? bow(x, y, 0.55, G.cream, '#e3c9b8') : bow(x, y, 0.55)}</g>; })}
              {bow(6, 15, 0.42)}
              {bow(134, 15, 0.42)}
            </g>
          )}
          {acc === 'plant' && (
            <g>
              {vine([[22, 7], [12, 16], [22, 36], [15, 56]], 5, 0.6)}
              {vine([[112, 7], [124, 16], [114, 34], [121, 50]], 4, 0.58, 1)}
              {vine([[66, 7], [58, 16], [68, 28], [63, 42]], 3, 0.55)}
              {[[18, 4, -150], [26, 4, -40], [62, 4, -140], [70, 4, -30], [108, 4, -145], [116, 4, -35]].map(([x, y, a], i) => <g key={x}>{pleaf(x, y, 0.55, a, VINE[i % 3])}</g>)}
            </g>
          )}
        </g>
      );
    },
  },
  ...catSet('tabby', TABBY, 'Tabby'),
  ...catSet('tortie', TORTIE, 'Tortie'),
};

// ---------- Recolor anything ----------
// Finds a drawing's main color family and shifts it (and its lighter/darker shades) to the picked color.
const toHsl = (hex) => {
  const h = hex6(hex), r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(hh * 60 + 360) % 360, s, l];
};
const fromHsl = (h, s, l) => {
  s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
};
const isHex = (v) => typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
const colorful = (hex) => { const [, s, l] = toHsl(hex); return s > 0.14 && l > 0.12 && l < 0.94; };
function walk(node, fn) {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, fn));
  if (!isValidElement(node)) return;
  fn(node.props, node.type);
  if (node.props.children) walk(Children.toArray(node.props.children), fn);
}
function mapTree(node, fn) {
  if (Array.isArray(node)) return node.map((n) => mapTree(n, fn));
  if (!isValidElement(node)) return node;
  const p = {}, kids = node.props.children;
  for (const a of ['fill', 'stroke', 'stopColor']) if (isHex(node.props[a])) { const v = fn(node.props[a]); if (v !== node.props[a]) p[a] = v; }
  if (node.props.style && isHex(node.props.style.color)) p.style = { ...node.props.style, color: fn(node.props.style.color) };
  if (kids != null && typeof kids !== 'string') p.children = Array.isArray(kids) ? kids.map((n) => mapTree(n, fn)) : mapTree(kids, fn);
  return Object.keys(p).length ? cloneElement(node, p) : node;
}
// Roughly how much of the picture a shape covers, so the "main" color is the biggest one, not the most repeated.
const areaOf = (pr, type) => {
  const n = (v) => Math.abs(parseFloat(v) || 0);
  if (type === 'rect') return n(pr.width) * n(pr.height);
  if (type === 'circle') return 3.14 * n(pr.r) ** 2;
  if (type === 'ellipse') return 3.14 * n(pr.rx) * n(pr.ry);
  if (type === 'path' && typeof pr.d === 'string') { const v = pr.d.match(/-?\d*\.?\d+/g)?.map(Number) || []; const xs = v.filter((_, i) => i % 2 === 0), ys = v.filter((_, i) => i % 2); return xs.length > 1 ? (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)) * 0.6 : 10; }
  return 0;
};
export function recolor(tree, color, hint) {
  if (!color || !isHex(color)) return tree;
  const count = {};
  walk(tree, (pr, type) => {
    if (type === 'text' || type === 'tspan') return;
    if (isHex(pr.fill) && colorful(pr.fill)) count[pr.fill.toLowerCase()] = (count[pr.fill.toLowerCase()] || 0) + areaOf(pr, type) + 1;
    if (isHex(pr.stroke) && colorful(pr.stroke) && pr.fill === 'none') count[pr.stroke.toLowerCase()] = (count[pr.stroke.toLowerCase()] || 0) + 4;
  });
  const main = hint || Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!main) return tree;
  const [h0, s0, l0] = toHsl(main), [h1, s1, l1] = toHsl(color);
  const hd = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const memo = {};
  return mapTree(tree, (c) => {
    const key = c.toLowerCase();
    if (key in memo) return memo[key];
    const [h, s, l] = toHsl(c);
    return (memo[key] = key === main.toLowerCase() ? color : colorful(c) && hd(h, h0) < 28 ? fromHsl(h1, Math.min(1, s1 * (s0 ? s / s0 : 1)), Math.max(0.08, Math.min(0.94, l1 + (l - l0) * 0.8))) : c);
  });
}

export function DecorArt({ k, flip, pot, tint, acc, light, wax, hue }) {
  const d = DECOR[k];
  if (!d) return null;
  const { w, h, art } = d;
  const g = recolor(art({ pot, tint, acc, light, wax }), hue);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" overflow="visible">
      {flip ? <g transform={`translate(${w} 0) scale(-1 1)`}>{g}</g> : g}
    </svg>
  );
}

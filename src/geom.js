import { getStroke } from 'perfect-freehand';

export const W = 1000, H = 1300;
export const r1 = (n) => Math.round(n * 10) / 10;
export const DEBUG = typeof location !== 'undefined' && location.search.includes('debug');

/* ---------- geometry ---------- */
const PEN = {
  fountain: { th: 0.85, smoothing: 0.5, streamline: 0.3, taper: true },
  ballpoint: { th: 0.6, smoothing: 0.55, streamline: 0.35 },
  fineliner: { th: 0.38, smoothing: 0.6, streamline: 0.4 },
  pencil: { th: 0.3, smoothing: 0.55, streamline: 0.3, taper: true },
};
// Stretch the S Pen's pressure so a normal writing press reaches the full range.
const ease = (t) => Math.min(1, Math.max(0, (t - 0.03) / 0.55));
const smooth = (stab, def) => (stab == null ? def : { smoothing: 0.35 + stab * 0.45, streamline: 0.05 + stab * 0.85 });
export function outline(points, tool, size, thinning, style, stab) {
  if (tool !== 'pen') {
    // Highlighter: flat chisel by default; "tapered" eases in and out at the ends like a real marker flick.
    const tp = style === 'tapered';
    return getStroke(points, { size, thinning: tp ? 0.2 : 0, ...smooth(stab, { smoothing: 0.5, streamline: 0.4 }), simulatePressure: false, last: true,
      ...(tp ? { start: { taper: size * 2.2, cap: true }, end: { taper: size * 2.2, cap: true } } : {}) });
  }
  const p = { ...(PEN[style] || PEN.fountain) };
  Object.assign(p, smooth(stab, { smoothing: p.smoothing, streamline: p.streamline }));
  return getStroke(points, {
    size,
    thinning: p.th,
    easing: ease,
    smoothing: p.smoothing,
    streamline: p.streamline,
    simulatePressure: false,
    last: true, // draw all the way to where the pen actually lifted, so fast letters aren't cut short
    start: { cap: true, taper: p.taper ? size * 1.5 : 0 },
    end: { cap: true, taper: p.taper ? size * 2 : 0 },
  });
}

export function toPath(o) {
  if (!o.length) return '';
  const d = o.reduce((acc, [x0, y0], i, a) => {
    const [x1, y1] = a[(i + 1) % a.length];
    acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    return acc;
  }, ['M', ...o[0], 'Q']);
  d.push('Z');
  return d.map((v) => (typeof v === 'number' ? r1(v) : v)).join(' ');
}
const cache = new WeakMap();
export function pathFor(s) {
  let d = cache.get(s);
  if (!d) { d = toPath(outline(s.points, s.tool, s.size, s.thinning, s.style, s.stab)); cache.set(s, d); }
  return d;
}
export function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const l = dx * dx + dy * dy;
  let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
export function hits(st, p, r) {
  const rr = r + st.size / 2;
  const pts = st.points;
  if (pts.length === 1) return Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]) < rr;
  for (let i = 1; i < pts.length; i++) if (segDist(p, pts[i - 1], pts[i]) < rr) return true;
  return false;
}
export function densify(a, b, step = 6) {
  const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
  return Array.from({ length: n + 1 }, (_, i) => [r1(a[0] + ((b[0] - a[0]) * i) / n), r1(a[1] + ((b[1] - a[1]) * i) / n), 0.5]);
}
export function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const a = pts[0], b = pts[pts.length - 1];
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) { const d = segDist(pts[i], a, b); if (d > dmax) { dmax = d; idx = i; } }
  if (dmax <= eps) return [a, b];
  const l = rdp(pts.slice(0, idx + 1), eps), r = rdp(pts.slice(idx), eps);
  return [...l.slice(0, -1), ...r];
}
const angleAt = (p, c, q) => {
  const a1 = Math.atan2(p[1] - c[1], p[0] - c[0]), a2 = Math.atan2(q[1] - c[1], q[0] - c[0]);
  let d = Math.abs(a1 - a2) * 180 / Math.PI; if (d > 180) d = 360 - d; return d;
};
export function polyErr(pts, v) {
  let sum = 0;
  for (const p of pts) { let m = Infinity; for (let i = 0; i < v.length; i++) m = Math.min(m, segDist(p, v[i], v[(i + 1) % v.length])); sum += m; }
  return sum / pts.length;
}
export function closedPoly(v) {
  return [...v, v[0]].reduce((out, c, i, arr) => (i ? [...out, ...densify(arr[i - 1], c).slice(1)] : [[r1(c[0]), r1(c[1]), 0.5]]), []);
}
export function snapShape(pts) {
  const a = pts[0], b = pts[pts.length - 1];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const diag = Math.hypot(maxX - minX, maxY - minY) || 1;
  let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const gap = Math.hypot(a[0] - b[0], a[1] - b[1]);

  // Shapes people mean to close usually end a little short of the start. If the stroke went most of the
  // way around (long compared to its size) and ends within about half the shape's size, treat it as closed.
  const closedish = gap <= diag * 0.25 || (gap < diag * 0.6 && len > diag * 2.2);
  if (!closedish) {
    // Basically straight: a line (angles near 0/45/90° lock in).
    if (gap / len >= 0.9) {
      let end = [b[0], b[1]];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
      const near = Math.round(ang / 45) * 45;
      if (Math.abs(ang - near) < 5) { const r = (near * Math.PI) / 180; end = [a[0] + gap * Math.cos(r), a[1] + gap * Math.sin(r)]; }
      return { kind: 'line', pts: densify(a, end) };
    }
    // Corners joined by straight-ish sides (an L, a zigzag, an open box): straighten each side.
    let o = rdp(pts, diag * 0.07);
    let ch = true;
    while (ch && o.length > 2) {
      ch = false;
      for (let i = 1; i < o.length - 1; i++) {
        if (angleAt(o[i - 1], o[i], o[i + 1]) > 155 || Math.hypot(o[i][0] - o[i - 1][0], o[i][1] - o[i - 1][1]) < diag * 0.08) { o.splice(i, 1); ch = true; break; }
      }
    }
    if (o.length >= 3 && o.length <= 7) {
      let e = 0;
      for (const p of pts) { let m = Infinity; for (let i = 1; i < o.length; i++) m = Math.min(m, segDist(p, o[i - 1], o[i])); e += m; }
      if (e / pts.length < diag * 0.05) return { kind: 'polyline', pts: o.reduce((out, c, i) => (i ? [...out, ...densify(o[i - 1], c).slice(1)] : [[r1(c[0]), r1(c[1]), 0.5]]), []) };
    }
    return null;
  }

  // Closed: find the corners the hand actually drew.
  let v = rdp([...pts, a], diag * 0.07).slice(0, -1);
  let changed = true;
  while (changed && v.length > 3) {
    changed = false;
    for (let i = 0; i < v.length; i++) {
      const p = v[(i - 1 + v.length) % v.length], c = v[i], q = v[(i + 1) % v.length];
      if (angleAt(p, c, q) > 150 || Math.hypot(c[0] - p[0], c[1] - p[1]) < diag * 0.08) { v.splice(i, 1); changed = true; break; }
    }
  }

  // Ellipse via principal axes (handles tilted ovals).
  const cx = xs.reduce((s, x) => s + x, 0) / pts.length, cy = ys.reduce((s, y) => s + y, 0) / pts.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pts) { sxx += (x - cx) ** 2; syy += (y - cy) ** 2; sxy += (x - cx) * (y - cy); }
  sxx /= pts.length; syy /= pts.length; sxy /= pts.length;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc, l2 = Math.max(1e-6, tr / 2 - disc);
  let th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const rx = Math.sqrt(2 * l1), ry = Math.sqrt(2 * l2);
  if (Math.abs(rx - ry) / rx < 0.12) th = 0; // near-circle: keep it upright
  else { const deg = (th * 180) / Math.PI, nd = Math.round(deg / 90) * 90; if (Math.abs(deg - nd) < 8) th = (nd * Math.PI) / 180; }
  const ell = Array.from({ length: 73 }, (_, i) => {
    const t = (i / 72) * Math.PI * 2, ex = rx * Math.cos(t), ey = ry * Math.sin(t);
    return [r1(cx + ex * Math.cos(th) - ey * Math.sin(th)), r1(cy + ex * Math.sin(th) + ey * Math.cos(th)), 0.5];
  });
  const eErr = polyErr(pts, ell.map((p) => [p[0], p[1]]));
  const pErr = v.length >= 3 ? polyErr(pts, v) : Infinity;
  if (v.length >= 3 && v.length <= 8 && pErr < eErr * 0.85) {
    // Squares and rectangles: straighten when every corner is near 90°.
    if (v.length === 4 && v.every((c, i) => Math.abs(angleAt(v[(i + 3) % 4], c, v[(i + 1) % 4]) - 90) < 24)) {
      let ang = Math.atan2(v[1][1] - v[0][1], v[1][0] - v[0][0]);
      const deg = (ang * 180) / Math.PI, nd = Math.round(deg / 90) * 90;
      if (Math.abs(deg - nd) < 8) ang = (nd * Math.PI) / 180;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const us = v.map(([x, y]) => (x - cx) * ux + (y - cy) * uy), vs = v.map(([x, y]) => -(x - cx) * uy + (y - cy) * ux);
      const u0 = Math.min(...us), u1 = Math.max(...us), w0 = Math.min(...vs), w1 = Math.max(...vs);
      const P = (u, w) => [cx + u * ux - w * uy, cy + u * uy + w * ux];
      return { kind: 'rect', pts: closedPoly([P(u0, w0), P(u1, w0), P(u1, w1), P(u0, w1)]) };
    }
    return { kind: 'poly', pts: closedPoly(v) };
  }
  return { kind: 'ellipse', pts: ell };
}
export function splitStroke(st, p, r) {
  const rr = r + st.size * 0.3;
  // Fill in points between the saved ones near the eraser so a tiny eraser cuts exactly where it touches.
  const step = Math.max(0.4, rr * 0.4), dense = [];
  st.points.forEach((q, i) => {
    const a = st.points[i - 1];
    if (a && Math.hypot(q[0] - p[0], q[1] - p[1]) < rr + 40) {
      const n = Math.min(200, Math.floor(Math.hypot(q[0] - a[0], q[1] - a[1]) / step));
      for (let k = 1; k < n; k++) { const t = k / n; dense.push([a[0] + (q[0] - a[0]) * t, a[1] + (q[1] - a[1]) * t, (a[2] ?? 0.5) + ((q[2] ?? 0.5) - (a[2] ?? 0.5)) * t]); }
    }
    dense.push(q);
  });
  const pieces = []; let cur = [];
  for (const q of dense) {
    if (Math.hypot(q[0] - p[0], q[1] - p[1]) < rr) { if (cur.length > 1) pieces.push(cur); cur = []; }
    else cur.push(q);
  }
  if (cur.length > 1) pieces.push(cur);
  return pieces.map((pts) => ({ ...st, id: crypto.randomUUID(), points: pts }));
}
export const isLight = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 140;
};

// Same layering as the page: highlighter under ink.
export const inkOrder = (list = []) => [...list].sort((a, b) => (a.tool === 'highlighter' ? 0 : 1) - (b.tool === 'highlighter' ? 0 : 1));

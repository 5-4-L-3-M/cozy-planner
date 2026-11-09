// Writing assist: levels a line of handwriting that drifts uphill/downhill and lines its words up
// on one baseline. Letter shapes and sizes are never changed — strokes are only rotated and shifted.
import { r1 } from './geom';

export function bbox(st) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of st.points) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
const median = (a) => { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : 0; };
const quantile = (a, q) => { const s = [...a].sort((p, r) => p - r); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };

// Typical letter height for a group (ignores dots and tall loops).
export function letterHeight(boxes) {
  const hs = boxes.map((b) => b.h).filter((h) => h > 2);
  return Math.max(6, median(hs));
}

// Does a new stroke belong on the same line as the group?
export function sameLine(allBoxes, b) {
  if (!allBoxes.length) return true;
  const h0 = letterHeight(allBoxes);
  const groupBoxes = allBoxes.filter((g) => !isOdd(g, h0));
  if (!groupBoxes.length || isOdd(b, h0)) return true; // a symbol on the row doesn't end the row
  const h = letterHeight(groupBoxes);
  const left = Math.min(...groupBoxes.map((g) => g.x0));
  if (b.x1 < left - h * 2) return false;
  // Compare the new stroke's middle with the row's own baseline (where it would be under this stroke).
  // Anything to the right at the same height continues the row, even after jumping ahead.
  const bl = groupBoxes.length >= 2 ? baseline(groupBoxes) : null;
  const base = bl ? bl.at(b.cx) : median(groupBoxes.map((g) => g.y1));
  const mid = base - h * 0.5;
  return Math.abs(b.cy - mid) < h * 0.95;
}

// Fit the baseline: robust slope (median of pairwise slopes) through stroke bottoms, so descenders (g, y, p)
// and dots don't tilt it. Returns { slope, at(x) } in page units.
export function baseline(boxes) {
  const h = letterHeight(boxes);
  const pts = boxes.filter((b) => b.h > h * 0.35).map((b) => [b.cx, b.y1]);
  if (pts.length < 2) return null;
  const slopes = [];
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const dx = pts[j][0] - pts[i][0];
    if (Math.abs(dx) > h * 0.5) slopes.push((pts[j][1] - pts[i][1]) / dx);
  }
  if (!slopes.length) return null;
  const m = median(slopes);
  const c = median(pts.map(([x, y]) => y - m * x));
  const spread = median(pts.map(([x, y]) => Math.abs(y - (m * x + c))));
  return { slope: m, at: (x) => m * x + c, h, spread, n: pts.length };
}

// Returns the straightened copies of the strokes, or null when there's nothing worth changing
// (too short to be a line of writing, already level, or steep enough to be on purpose).
// Strokes that don't look like ordinary letters (big symbols, long underlines, doodles) are ignored:
// they don't affect the baseline and are left exactly where they are.
export function isOdd(b, h) { return b.h > h * 2.6 || b.w > h * 8; }

export function straighten(all) {
  const allBoxes = all.map(bbox);
  const h0 = letterHeight(allBoxes);
  const keepIdx = all.map((s, i) => i).filter((i) => !isOdd(allBoxes[i], h0));
  const strokes = keepIdx.map((i) => all[i]);
  if (strokes.length < 4) return null;
  const boxes = strokes.map(bbox);
  const h = letterHeight(boxes);
  const left = Math.min(...boxes.map((b) => b.x0)), right = Math.max(...boxes.map((b) => b.x1));
  if (right - left < h * 3) return null;                     // a single letter or a doodle
  const bl = baseline(boxes);
  if (!bl) return null;
  const ang = Math.atan(bl.slope);
  const deg = (ang * 180) / Math.PI;
  if (Math.abs(deg) > 22) return null;                         // diagonal on purpose
  if (bl.n < 3 || bl.spread > h * 0.45) return null;            // too unsure where the line is: leave it alone

  // 1) Level the whole line, pivoting on the start of its baseline.
  const px = left, py = bl.at(left), cs = Math.cos(-ang), sn = Math.sin(-ang);
  const rot = (x, y) => [px + (x - px) * cs - (y - py) * sn, py + (x - px) * sn + (y - py) * cs];
  let out = Math.abs(deg) < 1.2 ? strokes.map((s) => ({ ...s })) : strokes.map((s) => ({ ...s, points: s.points.map(([x, y, p]) => { const [a, b] = rot(x, y); return [a, b, p]; }) }));

  // 2) Words that bob up or down sit back on the baseline (whole words move; letters inside them don't).
  const ob = out.map(bbox);
  const order = ob.map((b, i) => i).sort((a, b) => ob[a].x0 - ob[b].x0);
  const words = []; let cur = [], curR = -Infinity;
  for (const i of order) {
    if (cur.length && ob[i].x0 - curR > h * 0.7) { words.push(cur); cur = []; }
    cur.push(i); curR = Math.max(curR, ob[i].x1);
  }
  if (cur.length) words.push(cur);
  if (words.length > 1) {
    // A word's bottom = where most of its letters sit (descenders like g/y/p dip lower, so they're skipped).
    const wb = words.map((w) => { const main = w.filter((i) => ob[i].h > h * 0.35); return quantile((main.length ? main : w).map((i) => ob[i].y1), 0.34); });
    const target = median(wb);
    words.forEach((w, k) => {
      const dy = target - wb[k];
      if (Math.abs(dy) < h * 0.1 || Math.abs(dy) > h * 0.45) return;
      for (const i of w) out[i] = { ...out[i], points: out[i].points.map(([x, y, p]) => [x, y + dy, p]) };
    });
  }

  out = out.map((s) => ({ ...s, points: s.points.map(([x, y, p]) => [r1(x), r1(y), p]) }));
  const moved = out.some((s, i) => s.points.some((q, k) => Math.abs(q[0] - strokes[i].points[k][0]) > 0.4 || Math.abs(q[1] - strokes[i].points[k][1]) > 0.4));
  return moved ? { strokes: out, y: py, x0: left, x1: right, h } : null; // only the letters; odd strokes untouched
}

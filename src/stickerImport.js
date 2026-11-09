// Turn whatever you downloaded into stickers: single PNGs, whole sticker sheets (cut apart automatically),
// or a .zip of either. White backgrounds on sheets are made transparent.
import JSZip from 'jszip';

const IMG = /\.(png|jpe?g|webp|gif)$/i;

export async function expandFiles(files) {
  const out = [];
  for (const f of files) {
    if (/\.zip$/i.test(f.name) || f.type === 'application/zip' || f.type === 'application/x-zip-compressed') {
      const zip = await JSZip.loadAsync(f);
      const ready = Object.keys(zip.files).some((n) => n.split('/').pop() === '_ready'); // already trimmed & cut: import as-is
      const entries = Object.values(zip.files).filter((e) => !e.dir && IMG.test(e.name) && !e.name.includes('__MACOSX') && !/(^|\/)\./.test(e.name));
      entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      for (const e of entries) {
        const nf = new File([await e.async('blob')], e.name.split('/').pop(), { type: 'image/' + (e.name.split('.').pop().toLowerCase().replace('jpg', 'jpeg')) });
        // A folder inside the zip becomes the sticker category (one zip can fill many categories).
        const parts = e.name.split('/').filter(Boolean);
        if (parts.length > 1) nf.cat = parts[parts.length - 2];
        if (ready) nf.ready = true;
        out.push(nf);
      }
    } else if (f.type.startsWith('image/') || IMG.test(f.name)) out.push(f);
  }
  return out;
}

const load = (blob) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(blob); });

// Finds the separate stickers in an image. Returns crops as PNG blobs (one blob = the whole image trimmed).
export async function cutSheet(file) {
  const img = await load(file);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const W = Math.round(img.width * k), H = Math.round(img.height * k);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H), d = px.data;

  // Background: real transparency if the image has it, otherwise near-white paper.
  let transparent = 0;
  for (let i = 3; i < d.length; i += 4 * 7) if (d[i] < 20) transparent++;
  const hasAlpha = transparent > d.length / (4 * 7) * 0.05;
  const isBg = (i) => (hasAlpha ? d[i + 3] < 24 : d[i] > 238 && d[i + 1] > 238 && d[i + 2] > 238);
  if (!hasAlpha) {
    // Only treat white as background if the edges are mostly white (a sheet, not a photo).
    let edge = 0, white = 0;
    for (let x = 0; x < W; x += 4) for (const y of [0, H - 1]) { edge++; if (isBg((y * W + x) * 4)) white++; }
    for (let y = 0; y < H; y += 4) for (const x of [0, W - 1]) { edge++; if (isBg((y * W + x) * 4)) white++; }
    if (white / edge < 0.85) return { pieces: [file], sheet: false };
    for (let i = 0; i < d.length; i += 4) {
      // Soft edge: fade near-white to transparent so cut-outs don't keep a white box.
      const m = Math.min(d[i], d[i + 1], d[i + 2]);
      if (m > 238) d[i + 3] = 0; else if (m > 215) d[i + 3] = Math.round(d[i + 3] * (238 - m) / 23);
    }
    ctx.putImageData(px, 0, 0);
  }

  // Connected pieces on a coarse grid (cells merge nearby bits like letters in a word).
  const S = Math.max(4, Math.round(Math.max(W, H) / 220));
  const gw = Math.ceil(W / S), gh = Math.ceil(H / S), grid = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    let on = 0;
    for (let y = gy * S; y < Math.min(H, gy * S + S) && !on; y += 2) for (let x = gx * S; x < Math.min(W, gx * S + S); x += 2) if (d[(y * W + x) * 4 + 3] > 40) { on = 1; break; }
    grid[gy * gw + gx] = on;
  }
  // Grow by one cell so a sticker's own gaps don't split it.
  const g2 = grid.slice();
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (grid[y * gw + x]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < gh && xx >= 0 && xx < gw) g2[yy * gw + xx] = 1; }
  const lab = new Int32Array(gw * gh), boxes = [];
  for (let i = 0; i < g2.length; i++) {
    if (!g2[i] || lab[i]) continue;
    const id = boxes.length + 1, st = [i]; lab[i] = id;
    let x0 = gw, y0 = gh, x1 = 0, y1 = 0, n = 0;
    while (st.length) {
      const j = st.pop(), x = j % gw, y = (j / gw) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const q of [j - 1, j + 1, j - gw, j + gw]) {
        if (q < 0 || q >= g2.length || lab[q] || !g2[q]) continue;
        if ((q === j - 1 && x === 0) || (q === j + 1 && x === gw - 1)) continue;
        lab[q] = id; st.push(q);
      }
    }
    boxes.push({ x0, y0, x1, y1, n });
  }
  const minCells = gw * gh * 0.002;
  const keep = boxes.filter((b) => b.n >= minCells && (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) >= 9);
  const crop = async (bx) => {
    const pad = S;
    const x = Math.max(0, bx.x0 * S - pad), y = Math.max(0, bx.y0 * S - pad);
    const w = Math.min(W, (bx.x1 + 1) * S + pad) - x, h = Math.min(H, (bx.y1 + 1) * S + pad) - y;
    const o = document.createElement('canvas'); o.width = w; o.height = h;
    o.getContext('2d').drawImage(c, x, y, w, h, 0, 0, w, h);
    return new Promise((res) => o.toBlob(res, 'image/png'));
  };
  if (keep.length <= 1) {
    const all = keep[0] || { x0: 0, y0: 0, x1: gw - 1, y1: gh - 1 };
    return { pieces: [await crop(all)], sheet: false };
  }
  // Reading order: top-to-bottom rows, left-to-right.
  keep.sort((a, b) => (Math.abs(a.y0 - b.y0) < 6 ? a.x0 - b.x0 : a.y0 - b.y0));
  const pieces = [];
  for (const b of keep) pieces.push(await crop(b));
  return { pieces, sheet: true };
}

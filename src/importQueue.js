// Sticker imports run in the background: closing the sticker drawer or library doesn't stop them.
// No cap on how many; uploads go 4 at a time, and a file that fails is skipped (and can be retried).
import { useEffect, useState } from 'react';
import { expandFiles, cutSheet } from './stickerImport';
import { uploadImage } from './items';

let state = { active: false, done: 0, total: 0, failed: [], note: '', ask: null };
const subs = new Set();
const set = (p) => { state = { ...state, ...p }; subs.forEach((f) => f(state)); };
export function useImportState() {
  const [s, setS] = useState(state);
  useEffect(() => { subs.add(setS); setS(state); return () => { subs.delete(setS); }; }, []);
  return s;
}
export const answerAsk = (cut, all) => { const a = state.ask; set({ ask: null }); a?.resolve({ cut, all }); };
export const clearNote = () => set({ note: '', failed: [] });

const baseName = (n) => (n || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
let chain = Promise.resolve();
let ctx = null;

// files: File[]; target: folder name or null (asks). Resolves with the folders that got stickers.
export function enqueue(files, target, c) {
  ctx = c;
  const p = chain.then(() => run(files, target));
  chain = p.catch(() => {});
  return p;
}
export function retryFailed() {
  const f = state.failed; set({ failed: [], note: '' });
  const byCat = {};
  for (const x of f) (byCat[x.cat] ||= []).push(x.blob);
  return Promise.all(Object.entries(byCat).map(([cat, blobs]) => enqueue(blobs.map((b) => Object.assign(b, { ready: true })), cat, ctx)));
}

async function run(files, target) {
  const { stickerApi, update, mineCats } = ctx;
  set({ active: true, note: 'Opening files…' });
  let imgs = [];
  try { imgs = await expandFiles(files); } catch (e) { set({ active: false, note: 'Couldn’t open that file: ' + (e.message || e) }); return []; }
  if (!imgs.length) { set({ active: false, note: 'No images found — use PNG/JPG/WebP files, sticker sheets, or a .zip.' }); return []; }
  const foldered = imgs.every((f) => f.cat);
  if (!foldered && !target) target = prompt('Save these stickers to which folder?', mineCats[0] || 'My stickers') || 'My stickers';

  // 1) Work out the pieces (cutting sheets apart, asking once per batch if wanted).
  const jobs = [];
  let always = null;
  for (const f of imgs) {
    set({ note: `Reading ${f.name}…` });
    let r;
    try { r = f.ready ? { pieces: [f], sheet: false } : await cutSheet(f); } catch { r = { pieces: [f], sheet: false }; }
    let cut = true;
    if (r.sheet) {
      if (always === null) {
        const a = await new Promise((resolve) => set({ ask: { name: f.name, n: r.pieces.length, resolve } }));
        cut = a.cut; if (a.all) always = a.cut;
      } else cut = always;
    }
    const use = r.sheet && !cut ? [f] : r.pieces;
    use.forEach((b, i) => jobs.push({ blob: b, cat: f.cat || target, name: baseName(f.name) + (use.length > 1 ? ' ' + (i + 1) : '') }));
  }

  // 2) Upload, a few at a time. Positions are fixed up front so they keep their order.
  const base = Date.now();
  set({ total: state.total + jobs.length, note: '' });
  const cats = [];
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const k = next++, j = jobs[k];
      try {
        const { url, w, h } = await uploadImage(ctx.user, j.blob);
        stickerApi.add({ category: j.cat, kind: 'image', w, h, position: base + k, data: { url, name: j.name } });
        if (!cats.includes(j.cat)) cats.push(j.cat);
      } catch {
        set({ failed: [...state.failed, j] });
      }
      set({ done: state.done + 1 });
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, worker));
  const add = cats.filter((c) => !mineCats.includes(c));
  if (add.length) update((s) => ({ stickerCatOrder: [...new Set([...(s.stickerCatOrder || []), ...mineCats, ...add])] }));
  const fails = state.failed.length;
  if (state.done >= state.total) {
    set({ active: false, done: 0, total: 0, note: `Added ${jobs.length - fails} sticker${jobs.length - fails === 1 ? '' : 's'}${fails ? ` · ${fails} didn’t upload` : ''} ♡` });
    if (!fails) setTimeout(() => { if (!state.active && !state.failed.length) set({ note: '' }); }, 4000);
  }
  return cats;
}

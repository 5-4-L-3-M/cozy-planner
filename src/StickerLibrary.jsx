import { useEffect, useRef, useState } from 'react';
import { FLUENT } from './stickerPacks';
import { enqueue, useImportState, answerAsk, retryFailed, clearNote } from './importQueue';
import { Thumb } from './Drawer';
import Icon from './Icon';

/* ---------- shared helpers ---------- */
export const packItem = (key, cat) => ({ id: 'pack:' + key, pack: true, key, category: cat, name: key.replace(/-/g, ' ') });
export const stOf = (s) => (s.pack || s.kind === 'pack' ? { src: 'pack', key: s.key || s.data.key }
  : s.kind === 'image' ? { src: 'image', url: s.data.url } : { src: 'strokes', strokes: s.data.strokes, w0: s.w, h0: s.h });
// Tags: colors, art style, use, theme… stored with each sticker. Pack stickers get tags from their pack and name.
export const tagsOf = (s) => s.data?.tags || (s.pack || s.kind === 'pack' ? [(s.category || '').toLowerCase(), ...(s.key || s.data?.key || '').split('-')] : []);
// Every word you type has to match the start of a word in the name, a tag, or the folder.
export function matches(s, q) {
  const words = q.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (!words.length) return true;
  const hay = (nameOf(s) + ' ' + (s.category || '') + ' ' + tagsOf(s).join(' ')).toLowerCase().split(/[\s,&/-]+/);
  return words.every((w) => hay.some((h) => h.startsWith(w)));
}
export const COLOR_TAGS = { red: '#d9534f', pink: '#f2a1b6', peach: '#f6c4a3', orange: '#f0a04b', yellow: '#f3d36b', gold: '#d4af37', green: '#7fb069', teal: '#3fb6a8', blue: '#6ea8fe', purple: '#a98bd6', brown: '#8b5e3c', beige: '#e3d3b8', black: '#222222', white: '#ffffff', gray: '#9a9a9a' };
export const nameOf = (s) => s.name || s.data?.name || (s.kind === 'pack' ? s.data.key.replace(/-/g, ' ') : '');

// Files dragged in (or an image dragged straight off a web page).
export async function filesFrom(dt) {
  const files = [...(dt.files || [])];
  if (files.length) return files;
  const url = (dt.getData('text/uri-list') || dt.getData('text/plain') || '').split('\n')[0].trim();
  if (!/^https?:|^data:image/.test(url)) return [];
  try {
    const b = await (await fetch(url)).blob();
    if (!b.type.startsWith('image/')) return [];
    return [new File([b], url.split('/').pop().split('?')[0] || 'image.png', { type: b.type })];
  } catch {
    alert('That site won’t let images be grabbed directly. Save the image first, then drag the file in.');
    return [];
  }
}
export const hasFiles = (e) => [...(e.dataTransfer?.types || [])].some((t) => t === 'Files' || t === 'text/uri-list');

// Importing: PNGs, JPGs, sticker sheets (cut apart), and zips (folders become categories).
// The work runs in the background queue, so it keeps going after this panel closes.
export function useImporter({ user, stickerApi, mineCats, update }) {
  const st = useImportState();
  const run = (files, target) => (files.length ? enqueue(files, target, { user, stickerApi, mineCats, update }) : Promise.resolve([]));
  return { run, busy: st.active ? (st.total ? `Adding stickers ${st.done} of ${st.total}…` : st.note) : '', askEl: null };
}

// Little progress pill (and the “cut this sheet?” question) that stays up wherever you are.
export function ImportStatus() {
  const st = useImportState();
  if (!st.active && !st.note && !st.ask && !st.failed.length) return null;
  return (
    <div className="impstat" role="status">
      {st.ask ? <ImportAsk ask={st.ask} /> : (
        <>
          <span>{st.active && st.total ? `Adding stickers ${st.done} / ${st.total}` : st.note}</span>
          {st.active && st.total > 0 && <i className="impbar"><b style={{ width: (100 * st.done) / st.total + '%' }} /></i>}
          {!st.active && st.failed.length > 0 && <button className="mini" onClick={retryFailed}>Retry {st.failed.length}</button>}
          {!st.active && <button className="impx" onClick={clearNote} aria-label="Dismiss">×</button>}
        </>
      )}
    </div>
  );
}
function ImportAsk({ ask }) {
  const [all, setAll] = useState(false);
  return (
    <div className="cutask" role="dialog" aria-label="Cut sticker sheet">
      <b>Found {ask.n} stickers in “{ask.name}”</b>
      <span>Cut them apart into separate stickers?</span>
      <label className="toggle" style={{ marginTop: 4 }}><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /><span>Same answer for the rest of this import</span></label>
      <div className="prow" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button className="mini" onClick={() => answerAsk(false, all)}>Keep as one</button>
        <button className="btn primary" onClick={() => answerAsk(true, all)}>Cut apart</button>
      </div>
    </div>
  );
}

/* ---------- the library ---------- */
// Folders on the side, a big grid, search, multi-select, drag stickers onto a folder (or between
// stickers to reorder), drop or paste image files anywhere to import.
export default function StickerLibrary({ user, stickers, stickerApi, settings, update, onUse, onClose, start }) {
  const order = settings.stickerCatOrder || [];
  const mineCats = [...new Set([...order, ...stickers.map((s) => s.category)])];
  const hidden = settings.hiddenPacks || [];
  const favs = settings.stickerFavs || [];
  const [view, setView] = useState(start && (mineCats.includes(start) || FLUENT.some((p) => p.name === start) || start === 'Favorites' || start === 'Recent') ? start : 'All');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState([]);
  const [last, setLast] = useState(null);
  const [hot, setHot] = useState(null);
  const [dropHi, setDropHi] = useState(false);
  const [ghost, setGhost] = useState(null);
  const [showPacks, setShowPacks] = useState(false);
  const ts = settings.libThumb || 104;
  const file = useRef();
  const imp = useImporter({ user, stickerApi, mineCats, update });
  const isFolder = mineCats.includes(view);
  const pack = FLUENT.find((p) => p.name === view);

  const all = [...stickers, ...FLUENT.flatMap((p) => p.items.map((k) => packItem(k, p.name)))];
  const byId = Object.fromEntries(all.map((s) => [s.id, s]));
  const ql = q.trim().toLowerCase();
  const [tf, setTf] = useState([]); // tag filters
  const inView = view === 'All' ? all
    : view === 'Favorites' ? favs.map((id) => byId[id]).filter(Boolean)
      : view === 'Recent' ? (settings.recentStickers || []).map((id) => byId[id]).filter(Boolean)
        : [...(pack ? pack.items.map((k) => packItem(k, pack.name)) : []), ...stickers.filter((s) => s.category === view).sort((a, b) => a.position - b.position)];
  const base = ql ? inView.filter((s) => matches(s, ql)) : inView;
  const list = tf.length ? base.filter((s) => { const t = tagsOf(s); return tf.every((x) => t.includes(x)); }) : base;
  // Filter chips: colors present here, then the most common other tags.
  const tagCount = {};
  for (const s of list) for (const t of tagsOf(s)) tagCount[t] = (tagCount[t] || 0) + 1;
  const colorChips = Object.keys(COLOR_TAGS).filter((c) => tagCount[c] || tf.includes(c));
  const otherChips = [...new Set([...tf.filter((t) => !COLOR_TAGS[t]), ...Object.entries(tagCount).filter(([t, n]) => !COLOR_TAGS[t] && n < list.length && n > 1).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([t]) => t)])];
  const toggleTf = (t) => setTf((f) => (f.includes(t) ? f.filter((x) => x !== t) : [...f, t]));
  const [tagIn, setTagIn] = useState('');
  const selT = sel.map((id) => byId[id]).filter((x) => x && !x.pack);
  const common = selT.length ? tagsOf(selT[0]).filter((t) => selT.every((x) => tagsOf(x).includes(t))) : [];
  const addTag = (raw) => {
    const ts = raw.toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
    if (!ts.length) return;
    selT.forEach((x) => stickerApi.update(x.id, { data: { ...x.data, tags: [...new Set([...tagsOf(x), ...ts])] } }));
    setTagIn('');
  };
  const dropTag = (t) => selT.forEach((x) => stickerApi.update(x.id, { data: { ...x.data, tags: tagsOf(x).filter((y) => y !== t) } }));
  const selMine = sel.map((id) => byId[id]).filter((s) => s && !s.pack);
  const one = sel.length === 1 ? byId[sel[0]] : null;

  useEffect(() => { setSel([]); }, [view, ql]);
  useEffect(() => { setTf([]); }, [view]);
  const [lim, setLim] = useState(240);
  useEffect(() => { setLim(240); }, [view, ql, tf.length]);
  // Paste images (Ctrl+V) straight into the open folder.
  useEffect(() => {
    const onPaste = (e) => {
      if (e.target.closest?.('input,textarea')) return;
      const f = [...(e.clipboardData?.files || [])].filter((x) => x.type.startsWith('image/'));
      if (f.length) { e.preventDefault(); e.stopPropagation(); importTo(f, isFolder || pack ? view : null); }
    };
    const onKey = (e) => {
      if (e.target.closest?.('input,textarea')) return;
      if (e.key === 'Escape') { if (sel.length) setSel([]); else onClose(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selMine.length) del();
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); setSel(list.map((s) => s.id)); }
    };
    addEventListener('paste', onPaste, true); addEventListener('keydown', onKey);
    return () => { removeEventListener('paste', onPaste, true); removeEventListener('keydown', onKey); };
  });

  const importTo = async (files, target) => { const cats = await imp.run(files, target); if (cats[0] && !q) setView(cats[0]); };
  const tap = (e, s) => {
    if (e.shiftKey && last) {
      const ids = list.map((x) => x.id), a = ids.indexOf(last), b = ids.indexOf(s.id);
      if (a >= 0 && b >= 0) { setSel([...new Set([...sel, ...ids.slice(Math.min(a, b), Math.max(a, b) + 1)])]); return; }
    }
    // Mouse: click picks one, Ctrl/⌘-click adds or removes. Finger/pen: tap adds or removes.
    if (ptr.current === 'mouse' && !(e.ctrlKey || e.metaKey)) setSel(sel.length === 1 && sel[0] === s.id ? [] : [s.id]);
    else setSel(sel.includes(s.id) ? sel.filter((x) => x !== s.id) : [...sel, s.id]);
    setLast(s.id);
  };
  const ptr = useRef('mouse');
  const [box, setBox] = useState(null);
  // Drag on empty space (mouse/pen) to box-select; hold Shift or Ctrl to add to what's picked.
  const marquee = (e) => {
    if (e.target !== e.currentTarget || e.button > 0 || e.pointerType === 'touch') return;
    const keep = e.shiftKey || e.ctrlKey || e.metaKey ? sel : [];
    const x0 = e.clientX, y0 = e.clientY, grid = e.currentTarget;
    let moved = false;
    const mv = (ev) => {
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      moved = true;
      const b = { l: Math.min(x0, ev.clientX), t: Math.min(y0, ev.clientY), r: Math.max(x0, ev.clientX), b: Math.max(y0, ev.clientY) };
      setBox(b);
      const hit = [...grid.querySelectorAll('[data-sid]')].filter((el) => { const q = el.getBoundingClientRect(); return q.right > b.l && q.left < b.r && q.bottom > b.t && q.top < b.b; }).map((el) => el.dataset.sid);
      setSel([...new Set([...keep, ...hit])]);
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); setBox(null); if (!moved) setSel(keep); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  };
  const toggleFav = (ids) => {
    const allOn = ids.every((id) => favs.includes(id));
    update({ stickerFavs: allOn ? favs.filter((x) => !ids.includes(x)) : [...favs, ...ids.filter((x) => !favs.includes(x))] });
  };
  // Pack stickers moved into your folder become your own copies; yours just change folder.
  const moveTo = (ids, cat) => {
    if (!cat) return;
    if (!mineCats.includes(cat)) update({ stickerCatOrder: [...mineCats, cat] });
    ids.map((id) => byId[id]).filter(Boolean).forEach((s) => {
      if (s.pack) stickerApi.add({ category: cat, kind: 'pack', w: 160, h: 160, data: { key: s.key, name: s.name } });
      else if (s.category !== cat) stickerApi.update(s.id, { category: cat, position: Date.now() + Math.random() });
    });
    setSel([]);
  };
  const reorder = (ids, before) => {
    const mine = list.filter((s) => !s.pack && !ids.includes(s.id));
    const i = mine.findIndex((s) => s.id === before);
    if (i < 0) return;
    const lo = i ? mine[i - 1].position : mine[0].position - 1000, hi = mine[i].position;
    ids.map((id) => byId[id]).filter((s) => s && !s.pack).forEach((s, k, arr) => stickerApi.update(s.id, { position: lo + ((hi - lo) * (k + 1)) / (arr.length + 1) }));
  };
  const del = () => {
    if (!selMine.length || !confirm(`Delete ${selMine.length} sticker${selMine.length === 1 ? '' : 's'} from your library? Ones already on pages stay.`)) return;
    selMine.forEach((s) => stickerApi.remove(s.id));
    update({ stickerFavs: favs.filter((x) => !sel.includes(x)), recentStickers: (settings.recentStickers || []).filter((x) => !sel.includes(x)) });
    setSel([]);
  };
  const folder = {
    add() { const n = (prompt('Name the new folder') || '').trim(); if (n && !mineCats.includes(n)) { update({ stickerCatOrder: [...mineCats, n] }); setView(n); } },
    rename(c) {
      const n = (prompt('Rename this folder', c) || '').trim();
      if (!n || n === c) return;
      stickers.filter((s) => s.category === c).forEach((s) => stickerApi.update(s.id, { category: n }));
      update({ stickerCatOrder: mineCats.map((x) => (x === c ? n : x)) });
      setView(n);
    },
    move(c, d) { const l = [...mineCats], i = l.indexOf(c), j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; update({ stickerCatOrder: l }); },
    remove(c) {
      const inIt = stickers.filter((s) => s.category === c);
      if (inIt.length && !confirm(`Delete the folder “${c}” and its ${inIt.length} sticker${inIt.length === 1 ? '' : 's'}? Ones already on pages stay.`)) return;
      inIt.forEach((s) => stickerApi.remove(s.id));
      update({ stickerCatOrder: mineCats.filter((x) => x !== c) });
      setView(mineCats.find((x) => x !== c) || 'Favorites');
    },
  };

  // Mouse/pen drag: drop on a folder to move, or on a sticker to put them in front of it.
  const down = (e, s) => {
    ptr.current = e.pointerType;
    if (e.button > 0 || e.pointerType === 'touch') return;
    const x0 = e.clientX, y0 = e.clientY;
    let on = false, tgt = null;
    // Dragging a picked sticker drags every picked one; Ctrl/Shift-drag adds this one to the bunch.
    const ids = sel.includes(s.id) ? sel : e.ctrlKey || e.metaKey || e.shiftKey ? [...sel, s.id] : [s.id];
    const mv = (ev) => {
      if (!on && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 7) return;
      if (!on) setSel(ids);
      on = true;
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const f = el?.closest('[data-folder]'), t = el?.closest('[data-sid]');
      tgt = f ? { folder: f.dataset.folder } : t && (isFolder || pack) && !ql && !ids.includes(t.dataset.sid) ? { before: t.dataset.sid } : null;
      setHot(tgt ? tgt.folder || tgt.before : null);
      setGhost({ x: ev.clientX, y: ev.clientY, n: ids.length, st: stOf(s) });
    };
    const up = () => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up);
      setGhost(null); setHot(null);
      if (!on) return;
      window.__libDragged = Date.now();
      if (tgt?.folder) { if (tgt.folder === 'Favorites') { update({ stickerFavs: [...favs, ...ids.filter((x) => !favs.includes(x))] }); } else moveTo(ids, tgt.folder); }
      else if (tgt?.before) reorder(ids, tgt.before);
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  };

  const fileDrop = (target) => ({
    onDragOver: (e) => { if (hasFiles(e)) { e.preventDefault(); e.stopPropagation(); setDropHi(target || true); } },
    onDrop: async (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.stopPropagation(); setDropHi(false); importTo(await filesFrom(e.dataTransfer), target); },
  });
  const Folder = ({ id, label, icon, count, mine }) => (
    <div className={'libf' + (view === id ? ' on' : '') + (hot === id || dropHi === id ? ' hot' : '')} data-folder={id !== 'Recent' && id !== 'All' ? id : undefined}
      {...(id !== 'Recent' && id !== 'Favorites' && id !== 'All' ? fileDrop(id) : {})}>
      <button className="libfn" onClick={() => setView(id)}>{icon && <span className="libfi">{icon}</span>}<span className="libft">{label || id}</span>{count != null && <small>{count}</small>}</button>
      {mine && view === id && (
        <span className="libfx">
          <button aria-label="Move folder up" onClick={() => folder.move(id, -1)}>↑</button>
          <button aria-label="Move folder down" onClick={() => folder.move(id, 1)}>↓</button>
          <button aria-label="Rename folder" onClick={() => folder.rename(id)}>✎</button>
          <button aria-label="Delete folder" onClick={() => folder.remove(id)}>×</button>
        </span>
      )}
    </div>
  );

  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <section className={'lib' + (dropHi === true ? ' drop' : '')} aria-label="Sticker library" {...fileDrop(isFolder || pack ? view : null)} onDragLeave={(e) => { if (e.currentTarget === e.target) setDropHi(false); }}>
        <header className="libhead">
          <div className="ptitle hand">Sticker library</div>
          <label className="libsearch"><Icon n="search" s={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={view === 'All' ? 'Search all stickers' : `Search ${view}`} /></label>
          <label className="libsize" title="Thumbnail size"><span>▫</span><input type="range" min="64" max="180" value={ts} onChange={(e) => update({ libThumb: +e.target.value })} aria-label="Thumbnail size" /><span>◻</span></label>
          <button className="btn" onClick={() => file.current.click()}><Icon n="up" s={14} /> Import</button>
          <button className="ib libx" onClick={onClose} aria-label="Close library">×</button>
          <input ref={file} type="file" accept="image/*,.zip,application/zip" multiple hidden onChange={(e) => { importTo([...e.target.files], isFolder || pack ? view : null); e.target.value = ''; }} />
        </header>
        <div className="libbody">
          <nav className="libside">
            <Folder id="All" icon="▦" label="All stickers" count={all.length} />
            <Folder id="Favorites" icon="★" count={favs.length} />
            <Folder id="Recent" icon="🕘" />
            <div className="libgrp">YOUR FOLDERS <button className="mini" onClick={folder.add}>+ New</button></div>
            {mineCats.map((c) => <Folder key={c} id={c} mine count={stickers.filter((s) => s.category === c).length} />)}
            {!mineCats.length && <p className="hint">None yet — drop images here or tap Import.</p>}
            <div className="libgrp">PACKS <button className="mini" onClick={() => setShowPacks((v) => !v)}>{showPacks ? 'Done' : 'Show/hide'}</button></div>
            {FLUENT.filter((p) => showPacks || !hidden.includes(p.name)).map((p) => (
              <div key={p.name} className="libprow">
                <Folder id={p.name} count={p.items.length + stickers.filter((s) => s.category === p.name).length} />
                {showPacks && <button className="mini" onClick={() => update({ hiddenPacks: hidden.includes(p.name) ? hidden.filter((x) => x !== p.name) : [...hidden, p.name] })}>{hidden.includes(p.name) ? 'Hidden' : 'Shown'}</button>}
              </div>
            ))}
          </nav>
          <div className="libmain" onPointerDown={(e) => { if (e.target === e.currentTarget && !(e.shiftKey || e.ctrlKey || e.metaKey)) setSel([]); }}>
            {imp.busy && <p className="hint">{imp.busy}</p>}
            {imp.askEl}
            <div className="libtitle">
              <span className="hand">{view === 'All' ? 'All stickers' : view}</span>
              <small>{ql || tf.length ? `${list.length} match${list.length === 1 ? '' : 'es'}` : `${list.length} sticker${list.length === 1 ? '' : 's'}`}</small>
              {list.length > 0 && <button className="mini" onClick={() => setSel(sel.length === list.length ? [] : list.map((s) => s.id))}>{sel.length === list.length ? 'Select none' : 'Select all'}</button>}
            </div>
            {(colorChips.length > 0 || otherChips.length > 0) && (
              <div className="libtags">
                {colorChips.map((c) => <button key={c} className={'libcol' + (tf.includes(c) ? ' on' : '')} style={{ background: COLOR_TAGS[c] }} onClick={() => toggleTf(c)} title={c} aria-label={'Filter ' + c} />)}
                {otherChips.map((t) => <button key={t} className={'libtag' + (tf.includes(t) ? ' on' : '')} onClick={() => toggleTf(t)}>{t}</button>)}
                {tf.length > 0 && <button className="libtag clear" onClick={() => setTf([])}>clear filters</button>}
              </div>
            )}
            {!list.length && <div className="libempty">{view === 'Favorites' ? 'Star stickers to keep them here.' : view === 'Recent' ? 'Stickers you use show up here.' : 'Drop PNGs, sticker sheets or a .zip here — or paste with Ctrl+V.'}</div>}
            <div className="libgrid" style={{ '--ts': ts + 'px' }} onPointerDown={marquee}>
              {list.slice(0, lim).map((s) => (
                <div key={s.id} data-sid={s.id} className={'libtile' + (sel.includes(s.id) ? ' on' : '') + (hot === s.id ? ' hot' : '')}
                  onPointerDown={(e) => down(e, s)}
                  onClick={(e) => { if (Date.now() - (window.__libDragged || 0) < 200) return; tap(e, s); }}
                  onDoubleClick={() => onUse(s)} title={(nameOf(s) || 'Sticker') + (tagsOf(s).length ? '\n' + tagsOf(s).join(', ') : '')}>
                  <span className="libart"><Thumb st={stOf(s)} /></span>
                  <span className="libname">{nameOf(s) || <i>untitled</i>}</span>
                  <button className={'libstar' + (favs.includes(s.id) ? ' on' : '')} onClick={(e) => { e.stopPropagation(); toggleFav([s.id]); }} aria-label={favs.includes(s.id) ? 'Unfavorite' : 'Favorite'}>★</button>
                  {sel.includes(s.id) && <span className="libcheck">✓</span>}
                </div>
              ))}
            </div>
            {list.length > lim && <button className="mini" style={{ width: '100%', marginTop: 12 }} ref={(el) => { if (!el) return; const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); setLim((n) => n + 240); } }); io.observe(el); }} onClick={() => setLim((n) => n + 240)}>Show more ({list.length - lim} left)</button>}
          </div>
        </div>
        {sel.length > 0 && (
          <footer className="libbar">
            <b>{sel.length} selected</b>
            {one && <button className="btn primary" onClick={() => onUse(one)}>Put on page</button>}
            {one && !one.pack && <input className="libren" value={nameOf(one)} placeholder="Name it" onChange={(e) => stickerApi.update(one.id, { data: { ...one.data, name: e.target.value } })} aria-label="Sticker name" />}
            <button className="mini" onClick={() => toggleFav(sel)}>★ {sel.every((id) => favs.includes(id)) ? 'Unfavorite' : 'Favorite'}</button>
            <select className="libmove" value="" onChange={(e) => { const v = e.target.value === '__new' ? (prompt('New folder name') || '').trim() : e.target.value; moveTo(sel, v); }} aria-label="Move to folder">
              <option value="" disabled>{sel.some((id) => byId[id]?.pack) ? 'Copy to folder…' : 'Move to folder…'}</option>
              {mineCats.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__new">+ New folder…</option>
            </select>
            {selT.length > 0 && (
              <div className="libtagedit">
                {common.map((t) => <span key={t} className="libtag on">{t}<button onClick={() => dropTag(t)} aria-label={'Remove tag ' + t}>×</button></span>)}
                <form onSubmit={(e) => { e.preventDefault(); addTag(tagIn); }}><input value={tagIn} onChange={(e) => setTagIn(e.target.value)} placeholder={selT.length > 1 ? `+ tag all ${selT.length}` : '+ add tag'} aria-label="Add tag" /></form>
              </div>
            )}
            {selMine.length > 0 && <button className="mini danger" onClick={del}><Icon n="trash" s={14} /> Delete</button>}
            <button className="mini" onClick={() => setSel([])}>Clear</button>
          </footer>
        )}
        {dropHi && <div className="libdrop">Drop to add to {typeof dropHi === 'string' ? `“${dropHi}”` : isFolder ? `“${view}”` : 'your stickers'}</div>}
        {box && <div className="libbox" style={{ left: box.l, top: box.t, width: box.r - box.l, height: box.b - box.t }} />}
        {ghost && <div className="libghost" style={{ left: ghost.x, top: ghost.y }}><Thumb st={ghost.st} />{ghost.n > 1 && <b>{ghost.n}</b>}</div>}
      </section>
    </>
  );
}

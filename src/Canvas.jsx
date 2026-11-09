import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useStrokes } from './store';
import { useItems } from './items';
import { stabOf } from './Tools';
import { ItemView, itemCorners, itemHit } from './Items';
import { WIDGETS, MOODS, widgetLocal, WidgetEditor, refit } from './Widgets';
import Icon from './Icon';
import { dockOrder } from './dockButtons';
import ColorPop from './ColorPop';
import { weekRange } from './dates';
import { createPortal } from 'react-dom';
import { bbox, sameLine, baseline, straighten } from './writeAssist';
import { W, H as H0, DEBUG, r1, outline, toPath, pathFor, hits, densify, snapShape, splitStroke, isLight } from './geom';
export { W, H0 as H };
// Tall pages match modern phone screens (about 1 : 2.1) instead of the classic 1 : 1.3 sheet.
export const TALL_H = 1850;

const uid = () => crypto.randomUUID();
function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function boxOf(strokes, items) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const s of strokes) {
    const m = s.size / 2;
    for (const [x, y] of s.points) { a = Math.min(a, x - m); b = Math.min(b, y - m); c = Math.max(c, x + m); d = Math.max(d, y + m); }
  }
  for (const it of items) for (const [x, y] of itemCorners(it)) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
  return a === Infinity ? null : { x0: a, y0: b, x1: c, y1: d };
}
const rotPt = (t, x, y) => { const a = (t.rot * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a), dx = x - t.cx, dy = y - t.cy; return [t.cx + dx * c - dy * s, t.cy + dx * s + dy * c]; };
const xfPt = (t, x, y) => {
  if (t.cx == null) return [t.ox + (x - t.ox) * t.k + t.dx, t.oy + (y - t.oy) * t.k + t.dy];
  const [a, b] = rotPt(t, t.cx + (x - t.cx) * t.k, t.cy + (y - t.cy) * t.k);
  return [a + t.dx, b + t.dy];
};
const xfStroke = (s, t) => ({ ...s, size: r1(s.size * t.k), points: s.points.map(([x, y, p]) => { const [a, b] = xfPt(t, x, y); return [r1(a), r1(b), p]; }) });
const xfItem = (it, t) => {
  if (t.cx != null) {
    const [cx, cy] = xfPt(t, it.x + it.w / 2, it.y + it.h / 2), w = it.w * t.k, h = it.h * t.k;
    return { ...it, x: r1(cx - w / 2), y: r1(cy - h / 2), w: r1(w), h: r1(h), rot: r1((it.rot || 0) + (t.rot || 0)) };
  }
  const [x, y] = xfPt(t, it.x, it.y); return { ...it, x: r1(x), y: r1(y), w: r1(it.w * t.k), h: r1(it.h * t.k), rot: r1((it.rot || 0) + (t.rot || 0)) }; };
const ID_T = { dx: 0, dy: 0, k: 1, ox: 0, oy: 0, rot: 0 };

/* ---------- zoomed-in writing dock: a little pill you can drag anywhere and resize ---------- */
// Soft pastel for each dock button, so you can find them by color.
const DOCK_C = { pointer: '#f3e3c3', pen: '#a9c8f5', text: '#f7c4a5', highlighter: '#f6e39a', eraser: '#f5b3c8', lasso: '#cdb8f2', stickers: '#a8e0c6',
  undo: '#d9c3ee', redo: '#d9c3ee', left: '#b5e2e8', line: '#b5e2e8', right: '#b5e2e8', zoom: '#ecdcc8', exit: '#ecdcc8' };
const dc = (id) => ({ '--c': DOCK_C[id] });
export function WriteDock({ settings, update, drawTool, pos, onSave, onUndo, onRedo, eraserOn, onEraser, onLine, onRight, onLeft, zpct, onZoom, order, hide = [], focus, tool, onTool, color, onColor, onExit }) {
  const [p, setP] = useState(() => ({ x: null, y: null, k: 1, v: focus && innerWidth < 600, ...(pos || {}) }));
  const [cpop, setCpop] = useState(null);
  const [dropping, setDropping] = useState(false);
  useEffect(() => { if (dropping && tool !== 'eyedropper') { setDropping(false); setCpop(el.current); } }, [tool]);
  const el = useRef();
  const clampXY = (x, y) => {
    const r = el.current?.getBoundingClientRect() || { width: 220, height: 60 };
    return [Math.max(4, Math.min(innerWidth - r.width - 4, x)), Math.max(4, Math.min(innerHeight - r.height - 4, y))];
  };
  const drag = (e, kind) => {
    e.preventDefault(); e.stopPropagation();
    const r = el.current.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, k0 = p.k;
    let cur = p;
    const mv = (ev) => {
      if (kind === 'move') { const [x, y] = clampXY(r.left + ev.clientX - sx, r.top + ev.clientY - sy); cur = { ...cur, x: x / innerWidth, y: y / innerHeight }; }
      else { const d = cur.v ? (ev.clientY - sy) / Math.max(120, r.height) : (ev.clientX - sx) / Math.max(120, r.width); cur = { ...cur, k: Math.max(0.5, Math.min(1.7, k0 * (1 + d))) }; }
      setP(cur);
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); onSave(cur); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  };
  // Saved spots come from whichever screen you last moved it on: keep it fully on this screen.
  const [, bump] = useState(0);
  useEffect(() => { const f = () => bump((n) => n + 1); addEventListener('resize', f); requestAnimationFrame(f); return () => removeEventListener('resize', f); }, []);
  const style = p.x == null ? { right: 16, bottom: 'calc(20px + env(safe-area-inset-bottom))' } : (() => { const [x, y] = clampXY(p.x * innerWidth, p.y * innerHeight); return { left: x, top: y }; })();
  return (
    <div ref={el} className={'wdock' + (p.v ? ' vert' : '')} style={{ ...style, '--k': p.k }} onPointerDown={(e) => e.stopPropagation()}>
      <span className="wgrip" onPointerDown={(e) => drag(e, 'move')} aria-label="Drag to move">{p.v ? '⋯' : '⋮⋮'}</span>
      <button className="wb turn" aria-label={p.v ? 'Lay the dock flat' : 'Stand the dock up'} title="Rotate"
        onClick={() => { const n = { ...p, v: !p.v }; setP(n); onSave(n); requestAnimationFrame(() => { if (n.x == null) return; const [x, y] = clampXY(n.x * innerWidth, n.y * innerHeight); const m = { ...n, x: x / innerWidth, y: y / innerHeight }; setP(m); onSave(m); }); }}>⟳</button>
      {focus && <>
        {[['pen', 'Pen'], ['text', 'Text box'], ['highlighter', 'Highlighter'], ['eraser', 'Eraser'], ['lasso', 'Lasso']].map(([id, l]) => (
          <button key={id} style={dc(id)} className={'wb' + (tool === id ? ' on' : '')} aria-label={l} title={l + ' (tap again for settings)'} onClick={() => onTool(id)}><Icon n={id} s={18} dash={id === 'lasso'} /></button>
        ))}
        <button className="wb" style={dc('stickers')} aria-label="Stickers" onClick={() => onTool('stickers')}><Icon n="sticker" s={18} /></button>
        <button className="wb" aria-label="Colors" onClick={(e) => setCpop(e.currentTarget)}><span className="wcolor" style={{ background: color || '#3d3121' }} /></button>
        <span className="wsep" />
        <button className={'wb wfold' + (p.c ? ' shut' : '')} aria-label={p.c ? 'Show more buttons' : 'Hide extra buttons'} title={p.c ? 'Show more' : 'Show less'}
          onClick={() => { const n = { ...p, c: !p.c }; setP(n); onSave(n); }}>‹</button>
      </>}
      {!(focus && p.c) && dockOrder(order).filter((id) => !hide.includes(id) && !(focus && id === 'eraser')).map((id) => ({
        undo: <button key={id} style={dc(id)} className="wb" aria-label="Undo" onClick={onUndo}><Icon n="undo" s={18} /></button>,
        redo: <button key={id} style={dc(id)} className="wb" aria-label="Redo" onClick={onRedo}><Icon n="redo" s={18} /></button>,
        eraser: <button key={id} style={dc(id)} className={'wb' + (eraserOn ? ' on' : '')} aria-label="Switch between pen and eraser" onClick={onEraser}><Icon n="eraser" s={18} /></button>,
        left: <button key={id} style={dc(id)} className="wb" aria-label="Jump back" onClick={onLeft}>←</button>,
        line: <button key={id} style={dc(id)} className="wb" aria-label="Move to the next line" onClick={onLine}>↵</button>,
        right: <button key={id} style={dc(id)} className="wb" aria-label="Move right to keep writing" onClick={onRight}>→</button>,
        zoom: <button key={id} style={dc(id)} className="wb pct" aria-label="Zoom level, tap to change" onClick={onZoom}>{zpct}%</button>,
      })[id])}
      {focus && <><span className="wsep" /><button className="wb" style={dc('exit')} aria-label="Leave focus mode" title="Leave focus mode" onClick={onExit}><Icon n="shrink" s={18} /></button></>}
      <span className="wsize" onPointerDown={(e) => drag(e, 'size')} aria-label="Drag to resize" />
      {cpop && settings && createPortal(<ColorPop settings={settings} update={update} tool={tool === 'pen' || tool === 'highlighter' ? tool : drawTool} anchor={el.current} onClose={() => setCpop(null)} onDrop={async () => {
        if (window.EyeDropper) {
          // On PC Chrome: pick from anywhere on your screen; the pop-out comes back with that color.
          const k = tool === 'highlighter' || (tool !== 'pen' && drawTool === 'highlighter') ? 'highlighter' : 'pen';
          await new Promise((r) => setTimeout(r, 80));
          try { const { sRGBHex: c } = await new window.EyeDropper().open(); update((s) => ({ [k]: { ...s[k], color: c }, recentColors: [c, ...(s.recentColors || []).filter((x) => x !== c)].slice(0, 12) })); } catch { /* cancelled */ }
          setCpop(el.current); return;
        }
        setDropping(true); onTool && onTool('eyedropper');
      }} />, document.body)}
      {dropping && (
        <div className="dropbar" onPointerDown={(e) => e.stopPropagation()}>
          <span>Tap a color on the page</span>
          <button onClick={() => onTool && onTool(drawTool || 'pen')}>Cancel</button>
        </div>
      )}
    </div>
  );
}

/* ---------- component ---------- */
const Canvas = forwardRef(function Canvas({ page, settings, tool, onPick, progress, onProgress, pct, onDoubleTap, onSetTool, washi, onSaveSticker, onFavShape, onAddSheet, under, chips, onSettings, focus, onFocus, onTool, drawTool, onColor, headerCtx, onSaveHeader, pageSettings, spread, overlay, height, fit, ymap }, ref) {
  const [sorterTab, setSorterTab] = useState('pages');
  const [hdrPick, setHdrPick] = useState(false);
  const H = height || (page?.content?.shape === 'tall' ? TALL_H : H0);
  // Extra pages on one tab: phone scrolls down through all of them, PC shows one at a time with arrows.
  const sheets = Math.max(1, page?.content?.sheets || 1);
  const paged = typeof window !== 'undefined' && window.matchMedia('(min-width: 1000px)').matches;
  const [curSheet, setCurSheet] = useState(0);
  useEffect(() => { setCurSheet(0); }, [page?.id]);
  const cs = Math.min(curSheet, sheets - 1);
  // PC spread: two sheets side by side like an open journal (left = even sheet, right = the next one).
  const sp = paged && !!spread && !overlay;
  const GAP = 26, VW = sp ? 2 * W + GAP : W;
  const left = sp ? cs - (cs % 2) : cs;
  const hasRight = sp && left + 1 < sheets;
  const vy0 = paged ? left * H : 0, vh = paged ? H : sheets * H;
  // Page coords -> where they sit in the view (right-page things shift over and up).
  // Week page decorations are tied to the day they sit in: ymap shifts each thing to where its day is on this screen.
  const yo = (y) => (ymap ? ymap.off(y) : 0);
  const tv = (x, y) => { y += yo(y); return sp && y >= vy0 + H ? [x + W + GAP, y - H] : [x, y]; };
  const [sorter, setSorter] = useState(false);
  const { strokes, add, remove, persist, put } = useStrokes(page?.id);
  const { items, put: putItems, removeItems } = useItems(page?.id);
  const paperColor = page?.paper?.color || settings.paperColor;
  const paperStyle = page?.paper?.style || settings.paperStyle;
  const svg = useRef();
  const g = useRef(null);
  const strokesRef = useRef(strokes); strokesRef.current = strokes;
  const itemsRef = useRef(items); itemsRef.current = items;
  const livePath = useRef(), lassoPath = useRef();
  const raf = useRef(0);
  const pan = useRef(null);
  const undo = useRef([]), redo = useRef([]);
  const [sel, setSel] = useState({ s: [], i: [] });
  const [tf, setTf] = useState(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [editing, setEditing] = useState(null); // sticky note being typed into
  const [moodPick, setMoodPick] = useState(null);
  const [goalEdit, setGoalEdit] = useState(null);
  const [textEdit, setTextEdit] = useState(null);
  function openText(cur, b) {
    const W0 = WIDGETS[cur.data.type].size(cur.data), k = Math.min(cur.w / W0[0], cur.h / W0[1]);
    const [vx, vy] = tv(cur.x + b.x * k, cur.y + b.y * k);
    setTextEdit({ id: cur.id, key: b.key, value: b.value, chain: b.chain, label: b.label, placeholder: b.placeholder, next: b.next, left: (vx / VW) * 100, top: ((vy - vy0) / vh) * 100,
      width: ((b.w * k) / VW) * 100, height: ((b.h * k) / vh) * 100, font: Math.max(12, ((b.font || 15) * k) / pxToUnits()) });
  }
  // next = true when Enter was pressed on an "add" box: save it and open the next one right away.
  function saveText(v, next) {
    const te = textEdit; setTextEdit(null); if (!te) return;
    const it = itemsRef.current.find((x) => x.id === te.id); if (!it) return;
    const W1 = WIDGETS[it.data.type]; if (!W1?.setText) return;
    const nd = W1.setText(it.data, te.key, v.trim()); if (JSON.stringify(nd) === JSON.stringify(it.data)) return;
    const after = refit(it, nd);
    putItems([after]); push(() => putItems([it]), () => putItems([after]));
    if (next && te.chain && W1.addBox) setTimeout(() => openText(after, W1.addBox(after.data)), 30);
    else if (next && te.next && W1.box) { const b = W1.box(after.data, te.next); if (b) setTimeout(() => openText(after, b), 30); }
  }
  // Moving on to the next box (Next button / Enter), even if nothing changed in this one.
  function nextText(v) {
    const te = textEdit; if (!te) return;
    const it = itemsRef.current.find((x) => x.id === te.id); const W1 = it && WIDGETS[it.data.type];
    const nd = W1?.setText ? W1.setText(it.data, te.key, v.trim()) : null;
    if (nd && JSON.stringify(nd) !== JSON.stringify(it.data)) { saveText(v, true); return; }
    setTextEdit(null);
    if (te.next && W1?.box) { const b = W1.box(it.data, te.next); if (b) setTimeout(() => openText(it, b), 30); }
  }
  function saveGoal(text) {
    const ge = goalEdit; setGoalEdit(null); if (!ge) return;
    const it = itemsRef.current.find((x) => x.id === ge.id); if (!it) return;
    const goals = [...it.data.goals], v = text.trim();
    let done = { ...it.data.done };
    if (ge.i >= goals.length) { if (!v) return; goals.push(v); }
    else if (v) { if (v === goals[ge.i]) return; goals[ge.i] = v; }
    else { goals.splice(ge.i, 1); const d2 = {}; Object.keys(done).forEach((j) => { j = +j; if (j !== ge.i) d2[j > ge.i ? j - 1 : j] = true; }); done = d2; }
    const after = refit(it, { ...it.data, goals, done });
    putItems([after]); push(() => putItems([it]), () => putItems([after]));
  }
  const [wEdit, setWEdit] = useState(null);
  const [ovr, setOvr] = useState(null);
  const view = ovr ? items.map((x) => (x.id === ovr.id ? ovr : x)) : items;
  const hasSel = sel.s.length + sel.i.length > 0;
  const selStrokes = strokes.filter((s) => sel.s.includes(s.id));
  const selItems = view.filter((it) => sel.i.includes(it.id));
  const single = selItems.length === 1 && !selStrokes.length ? selItems[0] : null;
  const box = hasSel ? boxOf(selStrokes, selItems) : null;
  const [lockTip, setLockTip] = useState(null);
  const liveG = useRef(null);
  useEffect(() => { if (!lockTip) return; const t = setTimeout(() => setLockTip(null), 4000); return () => clearTimeout(t); }, [lockTip]);
  const clearSel = () => { setSel({ s: [], i: [] }); setColorOpen(false); };

  const push = (u, r, ids) => { undo.current.push({ u, r, ids }); redo.current = []; };

  // Draw the in-progress stroke straight onto one <path>, once per frame, without re-rendering the page.
  const drawLive = () => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const s = g.current, el = livePath.current, la = lassoPath.current;
      if (ymap && liveG.current) { const p0 = s?.pts?.[0] || s?.a; liveG.current.setAttribute('transform', p0 ? `translate(0 ${ymap.off(p0[1])})` : ''); }
      if (la) {
        if (s?.mode === 'lasso') la.setAttribute('d', 'M' + s.pts.map((p) => p[0] + ' ' + p[1]).join('L') + 'Z');
        else if (s?.mode === 'washi') la.setAttribute('d', `M${s.a[0]} ${s.a[1]}L${s.b[0]} ${s.b[1]}`);
        else la.setAttribute('d', '');
      }
      if (!el) return;
      if (!s || !s.cfg) { el.setAttribute('d', ''); return; }
      el.setAttribute('d', toPath(outline(s.pred && !s.snapped ? [...s.pts, ...s.pred] : s.pts, s.mode, s.cfg.size, s.cfg.sensitivity ?? 0.8, s.mode === 'pen' ? s.cfg.type || 'ballpoint' : s.cfg.taper ? 'tapered' : null, stabOf(s.mode, s.cfg))));
      el.setAttribute('fill', s.mode === 'mask' ? (overlay ? 'rgba(255,250,241,.85)' : paperColor) : s.cfg.color);
      if (s.mode === 'pen' && s.cfg.type === 'pencil') el.setAttribute('filter', `url(#${pid}-pencil)`); else el.removeAttribute('filter');
      el.setAttribute('opacity', s.cfg.opacity);
      el.style.mixBlendMode = s.mode === 'highlighter' && isLight(paperColor) ? 'multiply' : 'normal';
    });
  };
  const setLive = () => drawLive();

  useEffect(() => { undo.current = []; redo.current = []; clearSel(); }, [page?.id]);
  useEffect(() => { if (tool !== 'lasso') clearSel(); }, [tool]);

  // Where the middle of what you can currently see is, in page coordinates.
  function visibleCenter() {
    const r = svg.current.getBoundingClientRect(), sc = scroller()?.getBoundingClientRect() || r;
    const x0 = Math.max(r.left, sc.left), x1 = Math.min(r.right, sc.right), y0 = Math.max(r.top, sc.top), y1 = Math.min(r.bottom, sc.bottom);
    return [Math.min(W / 2, (((x0 + x1) / 2 - r.left) * VW) / r.width), (((y0 + y1) / 2 - r.top) * vh) / r.height + vy0];
  }

  function doUndo() { const e = undo.current.pop(); if (!e) return; e.u(); redo.current.push(e); clearSel(); }
  function doRedo() { const e = redo.current.pop(); if (!e) return; e.r(); undo.current.push(e); clearSel(); }
  useImperativeHandle(ref, () => ({
    undo: doUndo,
    redo: doRedo,
    openSorter() { setSorter(true); },
    canSwipe() { return zoom.current <= 1.01 && performance.now() - lastPen.current > 1500 && !g.current && !hasSel; },
    place(kind, data, w, h) {
      if (!page) return;
      const [cx, cy] = visibleCenter();
      const z = Math.max(0, ...itemsRef.current.map((x) => x.z || 0)) + 1;
      // A unit tracker added to a weekly page starts out titled with that week.
      if (kind === 'widget' && page.section === 'week' && page.week_start && !page.pinned) {
        if (data?.type === 'table') data = { ...data, title: 'week of ' + weekRange(page.week_start) };
        if (data?.type === 'unit') data = { ...data, week: 'week of ' + weekRange(page.week_start) };
      }
      const it = { id: uid(), page_id: page.id, kind, x: r1(cx - w / 2), y: r1(cy - h / 2), w, h, rot: 0, z, data };
      putItems([it]);
      push(() => removeItems([it.id]), () => putItems([it]));
      onSetTool && onSetTool('lasso');
      setTimeout(() => setSel({ s: [], i: [it.id] }), 0);
      if (kind === 'sticky') setEditing({ id: it.id, text: '' });
      // A new unit tracker asks for the unit right away (then property, then quote #).
      if (data?.type === 'unit' && !data.unit) setTimeout(() => openText(it, WIDGETS.unit.box(data, 'unit')), 80);
    },
  }));

  // Stop the S Pen from scrolling the page; fingers still scroll.
  useEffect(() => {
    const el = svg.current; if (!el) return;
    const block = (e) => { if ([...e.touches].some((t) => t.touchType === 'stylus')) e.preventDefault(); };
    el.addEventListener('touchstart', block, { passive: false });
    el.addEventListener('touchmove', block, { passive: false });
    return () => { el.removeEventListener('touchstart', block); el.removeEventListener('touchmove', block); };
  }, []);

  const rc = useRef(null);
  // If the page is still gliding from a pan/zoom when the pen lands (or moves under it), re-measure instead of drawing offset.
  useEffect(() => {
    const sc = svg.current?.closest('.pmain, .center'); if (!sc) return;
    const f = () => { if (rc.current) rc.current = 'want'; };
    sc.addEventListener('scroll', f, { passive: true }); addEventListener('resize', f);
    return () => { sc.removeEventListener('scroll', f); removeEventListener('resize', f); };
  }, []);
  const pt = (e) => {
    if (rc.current === 'want') rc.current = svg.current.getBoundingClientRect(); // measured once, after any palm rewind
    const r = rc.current || svg.current.getBoundingClientRect();
    let x = ((e.clientX - r.left) * VW) / r.width, y = ((e.clientY - r.top) * vh) / r.height + vy0;
    if (ymap) y = ymap.inv(y);
    if (sp && x > W + GAP / 2) { x -= W + GAP; y += H; }
    return [r1(x), r1(y),
      e.pointerType === 'pen' ? Math.max(0.05, r1(e.pressure || 0.5)) : 0.5];
  };
  const pxToUnits = () => VW / (svg.current?.getBoundingClientRect().width || 600);

  const pickColor = (p) => {
    const list = strokesRef.current;
    const pens = list.filter((s) => s.tool === 'pen').reverse();
    const hls = list.filter((s) => s.tool === 'highlighter').reverse();
    const hit = [...pens, ...hls].find((s) => hits(s, p, 6));
    return hit ? hit.color : paperColor;
  };

  function eraseAt(p) {
    const s = g.current;
    const r = settings.eraser.size;
    const f = settings.eraser.filter || 'all';
    for (const st of [...s.list]) {
      if (st.tool === 'mask') continue;
      if (f !== 'all' && st.tool !== f) continue;
      if (!hits(st, p, r)) continue;
      s.list = s.list.filter((x) => x.id !== st.id);
      const ai = s.added.findIndex((x) => x.id === st.id);
      if (ai >= 0) s.added.splice(ai, 1); else s.removed.push(st);
      remove([st.id], false);
      if (settings.eraser.mode === 'partial') {
        const pieces = splitStroke(st, p, r);
        s.list.push(...pieces); s.added.push(...pieces);
        add(pieces, false);
      }
    }
  }

  function armSnap() {
    const s = g.current;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      if (g.current !== s || s.pts.length < 4) return;
      let len = 0;
      for (let i = 1; i < s.pts.length; i++) len += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]);
      if (len < 70) return; // small marks (letters, dots) never snap
      // Filled-in dots (bullets) scribble a long path in a tiny space: size, not length, decides.
      const xs = s.pts.map((q) => q[0]), ys = s.pts.map((q) => q[1]);
      const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
      if (Math.max(bw, bh) < Math.max(55, 48 * pxToUnits())) return; // small on screen = a dot, never a shape
      if (len > 2.6 * (bw + bh) * 2) return; // going round and round (filling in a bullet) isn't drawing a shape
      const sh = snapShape(s.pts);
      if (!sh) return;
      s.snapped = sh; s.pts = sh.pts;
      setLive();
    }, 650);
  }

  // Fingers scroll and pinch-zoom by hand, so the browser never steals a pen stroke.
  function scroller() { return svg.current?.closest('.pmain, .center'); }
  const sheet = useRef();
  const zoom = useRef(1);
  const touches = useRef(new Map());
  const [zpct, setZpct] = useState(100);
  const zraf = useRef(0);
  // Zoomed in, the page gets a margin of empty desk around it so you can pan past its edges.
  // On the week page the whole page (to-dos + decorations) zooms together.
  const zEl = () => (overlay ? svg.current?.closest('.weekpage') || sheet.current : sheet.current);
  const padOf = (z, sc) => overlay ? 0 : Math.round((sc?.clientWidth || innerWidth) * 0.18 * Math.min(1, Math.max(0, (z - 1) / 0.5)));
  const applyZoom = (z) => {
    const el = zEl(); if (!el) return;
    if (rc.current) rc.current = 'want'; // page box moved: measure again
    if (overlay) { el.style.zoom = z === 1 ? '' : String(z); setZpct(Math.round(z * 100)); return; }
    const p = padOf(z, scroller());
    el.style.width = `calc(${z * 100}% + ${2 * p}px)`;
    el.style.padding = `${Math.round(p * 0.6)}px ${p}px`;
    el.style.setProperty('--z', z);
    setZpct(Math.round(z * 100));
  };
  // Pinch let go: apply the real zoom and keep the spot between your fingers where it was.
  function pinchCommit(pn) {
    if (pn.done) return; pn.done = true;
    const el = zEl(), sc = pn.sc; if (!el || !sc) return;
    el.style.transform = ''; el.style.willChange = '';
    const z = pn.zNow; zoom.current = z; applyZoom(z);
    const r = sc.getBoundingClientRect(), p1 = padOf(z, sc);
    sc.scrollLeft = pn.cx * z + p1 - (pn.mLast.x - r.left);
    sc.scrollTop = pn.cy * z + p1 * 0.6 - (pn.mLast.y - r.top);
  }
  const setZoom = (z) => {
    zoom.current = z;
    if (zraf.current) return;
    zraf.current = requestAnimationFrame(() => { zraf.current = 0; applyZoom(zoom.current); });
  };
  // Slide the zoomed view along like a typewriter: right a bit, or back to the left edge one line down.
  function nudge(kind) {
    const sc = scroller(); if (!sc) return;
    cancelAnimationFrame(glide.current);
    const atRight = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - padOf(zoom.current, sc) - 4;
    if (kind === 'left') {
      // Jump back: slide left; at the left edge, go up a line to the far right.
      if (sc.scrollLeft > padOf(zoom.current, sc) + 4) sc.scrollTo({ left: Math.max(padOf(zoom.current, sc), sc.scrollLeft - sc.clientWidth * 0.6), behavior: 'smooth' });
      else sc.scrollTo({ left: sc.scrollWidth - sc.clientWidth - padOf(zoom.current, sc), top: Math.max(0, sc.scrollTop - sc.clientHeight * 0.22), behavior: 'smooth' });
      return;
    }
    if (kind === 'right' && !atRight) sc.scrollTo({ left: sc.scrollLeft + sc.clientWidth * 0.6, behavior: 'smooth' });
    else {
      if (wa.current.list.length) assistFlush(true); // new line: finish the row you were on
      sc.scrollTo({ left: padOf(zoom.current, sc), top: sc.scrollTop + sc.clientHeight * 0.22, behavior: 'smooth' });
    }
  }
  const dockPortal = (el) => (overlay ? createPortal(el, document.body) : el);
  // Done decorating: the week page goes back to normal size.
  useEffect(() => { if (overlay && tool === 'pointer' && zoom.current !== 1) { zoom.current = 1; applyZoom(1); } }, [overlay, tool]);
  const cycleZoom = () => { const steps = [0.8, 1, 1.5, 2, 3, 5]; zoomTo(steps.find((z) => z > zoom.current + 0.05) || 1); };
  function zoomTo(z) {
    const sc = scroller(); if (!sc) return;
    const p0 = padOf(zoom.current, sc), p1 = padOf(z, sc);
    const cx = (sc.scrollLeft + sc.clientWidth / 2 - p0) / zoom.current, cy = (sc.scrollTop + sc.clientHeight / 2 - p0 * 0.6) / zoom.current;
    zoom.current = z;
    applyZoom(z);
    sc.scrollLeft = cx * z + p1 - sc.clientWidth / 2; sc.scrollTop = cy * z + p1 * 0.6 - sc.clientHeight / 2;
  }

  // Palm rejection: any touch while the pen is down, hovering, or used in the last 1.5s is ignored,
  // and so is any wide contact patch (a palm, not a fingertip).
  const lastPen = useRef(0), lastHover = useRef(0), pinchEnd = useRef(0), glide = useRef(0);
  const palmy = (e) => {
    const now = performance.now();
    return !!g.current || now - lastPen.current < 350 || now - lastHover.current < 150 || (e.width || 0) > 60 || (e.height || 0) > 60;
  };

  // ?debug in the address shows what the pen and fingers report.
  const dbg = useRef();
  const log = (e) => {
    if (!DEBUG || !dbg.current) return;
    const line = `${e.type} ${e.pointerType || ''} button:${e.button} buttons:${e.buttons} p:${(e.pressure ?? 0).toFixed(2)} w:${Math.round(e.width || 0)} h:${Math.round(e.height || 0)}`;
    const lines = dbg.current.textContent.split('\n').filter(Boolean);
    if (e.type === 'pointermove' && lines.length && lines[lines.length - 1].startsWith('pointermove')) lines.pop();
    lines.push(line);
    dbg.current.textContent = lines.slice(-8).join('\n');
  };

  // Palm rewind: if the pen shows up while a "finger" is still on the glass (or just lifted),
  // that touch was a palm, so put the page back exactly where it was before it landed.
  const snap = useRef(null);
  function rewind() {
    const v = snap.current; snap.current = null;
    if (!v) return;
    const live = touches.current.size > 0, recent = performance.now() - v.end < 200;
    if (!live && !recent) return;
    cancelAnimationFrame(glide.current);
    zoom.current = v.z;
    applyZoom(v.z);
    v.sc.scrollLeft = v.l; v.sc.scrollTop = v.t;
    touches.current.clear(); pan.current = null; tap.current = null;
  }

  function startGesture(sc) {
    const ts = [...touches.current.values()];
    if (ts.length === 1) pan.current = { mode: 'pan', sc, sx: ts[0].x, sy: ts[0].y, left: sc.scrollLeft, top: sc.scrollTop };
    else if (ts.length >= 2) {
      const [a, b] = ts, r = sc.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      const p0 = padOf(zoom.current, sc);
      // While pinching, the page is just stretched on screen (smooth, no redrawing); the real zoom is applied when you let go.
      const zel = zEl(), sr = zel.getBoundingClientRect(), m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      pan.current = { mode: 'pinch', sc, d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: zoom.current, zNow: zoom.current, m0, mLast: m0,
        ox: m0.x - sr.left, oy: m0.y - sr.top,
        cx: (sc.scrollLeft + mx - p0) / zoom.current, cy: (sc.scrollTop + my - p0 * 0.6) / zoom.current };
      zel.style.willChange = 'transform';
    }
  }

  // Double-tap (pen or finger) toggles eraser. A tap = quick touch that barely moves.
  const tap = useRef(null);
  const lastUp = useRef(null);
  const lastTap = useRef(null);
  const pressStart = (e) => { tap.current = { t: performance.now(), x: e.clientX, y: e.clientY, moved: false }; };
  const pressMove = (e) => { const t = tap.current; if (t && Math.hypot(e.clientX - t.x, e.clientY - t.y) > (e.pointerType === 'pen' ? 3 : 10)) t.moved = true; };
  function pressEnd(e, ids = []) {
    const t = tap.current; tap.current = null;
    // Pen double-taps must be quick and on the same spot, so fast small writing (colons, i-dots, short dashes) never counts.
    const pen = e.pointerType === 'pen';
    if (pen && !settings.penDoubleTap) { lastTap.current = null; return; }
    if (!t || t.moved || performance.now() - t.t > (pen ? 170 : 250)) { lastTap.current = null; return; }
    const prev = lastTap.current, now = performance.now();
    if (prev && now - prev.t < (pen ? 380 : 350) && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < (pen ? 12 : 14)) {
      const dots = [...prev.ids, ...ids];
      if (dots.length) {
        remove(dots);
        undo.current = undo.current.filter((u) => !(u.ids && u.ids.every((id) => dots.includes(id))));
      }
      lastTap.current = null;
      onDoubleTap && onDoubleTap();
      return;
    }
    lastTap.current = { t: now, x: e.clientX, y: e.clientY, ids };
  }

  const sideButton = (e) => e.pointerType === 'pen' && (e.button === 2 || e.button === 5 || (e.buttons & 2) || (e.buttons & 32));

  function startEraser(p) {
    if (settings.eraser.mode === 'precise') {
      // Precise: draw with the eraser like ink; when you lift, it hides exactly what it covered (nothing else moves).
      g.current = { mode: 'mask', cfg: { size: settings.eraser.size * 2, color: '#000', opacity: 1, stabilize: { highlighter: 0.12 } }, pts: [p], anchor: p, timer: null, snapped: null, filter: settings.eraser.filter || 'all' };
      setLive(); return;
    }
    g.current = { mode: 'eraser', list: strokesRef.current.slice(), added: [], removed: [] };
    eraseAt(p);
  }

  /* ---------- trackers (widgets) ---------- */
  const widgetAt = (p) => [...itemsRef.current].filter((x) => x.kind === 'widget').sort((a, b) => (b.z || 0) - (a.z || 0)).find((it) => itemHit(it, p));
  function widgetTap(it, p) {
    const [x, y] = widgetLocal(it, p);
    const res = WIDGETS[it.data.type]?.tap(it.data, x, y);
    if (!res) return;
    if (res.editGoal !== undefined) {
      // Type right on the page: an input sits over that goal's row.
      const k = Math.min(it.w / WIDGETS.goals.size(it.data)[0], it.h / WIDGETS.goals.size(it.data)[1]);
      const [vx, vy] = tv(it.x + 52 * k, it.y + (54 + res.editGoal * 40) * k);
      setGoalEdit({ id: it.id, i: res.editGoal, left: (vx / VW) * 100, top: ((vy - vy0) / vh) * 100,
        width: ((310 * k) / VW) * 100, height: ((40 * k) / vh) * 100, font: (21 * k) / pxToUnits() });
      return;
    }
    if (res.openEditor) { setWEdit(it); return; }
    if (res.editText) {
      // Type right on the page: a box sits over that part of the tracker.
      let cur = it;
      if (res.data) { cur = refit(it, res.data); putItems([cur]); push(() => putItems([it]), () => putItems([cur])); }
      openText(cur, res.editText);
      return;
    }
    if (res.pickMood !== undefined) {
      const [vx, vy] = tv(p[0], p[1]);
      setMoodPick({ id: it.id, day: res.pickMood, left: (vx / VW) * 100, top: ((vy - vy0) / vh) * 100 });
      return;
    }
    const after = refit(it, res);
    putItems([after]); push(() => putItems([it]), () => putItems([after]));
  }

  /* ---------- single item: move, resize (even / length / width), rotate ---------- */
  const rotV = (it, x, y) => { const r = ((it.rot || 0) * Math.PI) / 180; return [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]; };
  function local(it, p) {
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    const [lx, ly] = rotV({ rot: -(it.rot || 0) }, p[0] - cx, p[1] - cy);
    return [lx + it.w / 2, ly + it.h / 2];
  }
  const roomy = (len) => Math.max(0, (84 * pxToUnits() - len) / 2);
  function hitSingle(it, p) {
    const hr = 22 * pxToUnits(), [lx, ly] = local(it, p), near = (x, y) => Math.hypot(lx - x, ly - y) < hr * 1.3;
    const px = roomy(it.w), py = roomy(it.h);
    if (near(it.w + px, it.h + py)) return 'resize';
    if (near(it.w / 2, -py - hr * 2.2)) return 'rotate';
    if (near(it.w + px, it.h / 2)) return 'w';
    if (near(it.w / 2, it.h + py)) return 'h';
    const pad = hr * 0.5;
    if (lx > -px - pad && lx < it.w + px + pad && ly > -py - pad && ly < it.h + py + pad) return 'move';
    return null;
  }
  function startSingle(kind, p, it) { g.current = { mode: 'imanip', kind, p0: p, it0: it, l0: local(it, p) }; }
  function singleMove(p) {
    const { kind, p0, it0, l0 } = g.current;
    if (kind === 'move') { setOvr({ ...it0, x: r1(it0.x + p[0] - p0[0]), y: r1(it0.y + p[1] - p0[1]) }); return; }
    const cx0 = it0.x + it0.w / 2, cy0 = it0.y + it0.h / 2;
    if (kind === 'rotate') {
      let rot = (it0.rot || 0) + ((Math.atan2(p[1] - cy0, p[0] - cx0) - Math.atan2(p0[1] - cy0, p0[0] - cx0)) * 180) / Math.PI;
      const near = Math.round(rot / 45) * 45; if (Math.abs(rot - near) < 4) rot = near;
      setOvr({ ...it0, rot: r1(rot) }); return;
    }
    const [lx, ly] = local(it0, p);
    let w = it0.w, h = it0.h;
    // Changes follow how far you've dragged from where you grabbed, so nothing jumps when you start.
    if (kind === 'resize') { const k = Math.max(0.05, (lx + ly) / (l0[0] + l0[1] || 1)); w = it0.w * k; h = it0.h * k; }
    if (kind === 'w') w = Math.max(6, it0.w + lx - l0[0]);
    if (kind === 'h') h = Math.max(6, it0.h + ly - l0[1]);
    const [tx, ty] = rotV(it0, -it0.w / 2, -it0.h / 2), [nx, ny] = rotV(it0, w / 2, h / 2);
    const cx = cx0 + tx + nx, cy = cy0 + ty + ny;
    setOvr({ ...it0, w: r1(w), h: r1(h), x: r1(cx - w / 2), y: r1(cy - h / 2) });
  }
  function singleEnd(s) {
    const after = ovrRef.current; setOvr(null);
    if (!after || JSON.stringify(after) === JSON.stringify(s.it0)) return;
    const before = s.it0;
    putItems([after]); push(() => putItems([before]), () => putItems([after]));
  }
  const ovrRef = useRef(null); ovrRef.current = ovr;

  /* ---------- selection handles ---------- */
  function hitSel(p) {
    if (!box) return null;
    const hr = 22 * pxToUnits(), px = roomy(box.x1 - box.x0), py = roomy(box.y1 - box.y0);
    if (Math.hypot(p[0] - box.x1 - px, p[1] - box.y1 - py) < hr * 1.4) return 'resize';
    if (Math.hypot(p[0] - (box.x0 + box.x1) / 2, p[1] - (box.y0 - py - hr * 2.2)) < hr * 1.4) return 'rotate';
    const pad = hr * 0.6;
    if (p[0] > box.x0 - px - pad && p[0] < box.x1 + px + pad && p[1] > box.y0 - py - pad && p[1] < box.y1 + py + pad) return 'move';
    return null;
  }
  function startManip(kind, p, base) {
    const b = boxOf(base.strokes, base.items);
    g.current = { mode: 'manip', kind, p0: p, box: b, base };
    setTf({ ...ID_T, ox: b.x0, oy: b.y0 });
  }
  function manipMove(p) {
    const s = g.current, b = s.box;
    if (s.kind === 'move') setTf({ ...ID_T, dx: p[0] - s.p0[0], dy: p[1] - s.p0[1] });
    else if (s.kind === 'resize') {
      // Scale along the line from the top-left corner to where you grabbed (works with a roomy frame too).
      const ax = s.p0[0] - b.x0, ay = s.p0[1] - b.y0;
      const k = Math.max(0.05, ((p[0] - b.x0) * ax + (p[1] - b.y0) * ay) / (ax * ax + ay * ay || 1));
      setTf({ ...ID_T, k, ox: b.x0, oy: b.y0 });
    } else if (s.kind === 'rotate') {
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      let rot = ((Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(s.p0[1] - cy, s.p0[0] - cx)) * 180) / Math.PI;
      const near = Math.round(rot / 45) * 45; if (Math.abs(rot - near) < 4) rot = near;
      setTf({ ...ID_T, rot, cx, cy });
    }
  }
  function manipEnd(s) {
    const t = tfRef.current || ID_T;
    setTf(null);
    if (Math.abs(t.dx) + Math.abs(t.dy) < 1 && Math.abs(t.k - 1) < 0.005 && Math.abs(t.rot) < 0.5) return;
    const ids = new Set(s.base.strokes.map((x) => x.id));
    const marks = strokesRef.current.filter((m) => m.tool === 'mask' && m.style?.startsWith('m:') && m.style.slice(2).split(',').every((id) => ids.has(id)));
    const bS = [...s.base.strokes, ...marks], bI = s.base.items;
    const aS = bS.map((x) => xfStroke(x, t)), aI = bI.map((x) => xfItem(x, t));
    put(aS); putItems(aI);
    push(() => { put(bS); putItems(bI); }, () => { put(aS); putItems(aI); });
  }
  const tfRef = useRef(null); tfRef.current = tf;
  const thickStart = useRef(null);

  /* ---------- selection actions ---------- */
  const act = {
    // Locked things stay put: the lasso skips them until you unlock them (tap one with the lasso).
    lock() {
      const bI = selItems, aI = bI.map((x) => ({ ...x, data: { ...x.data, locked: true } }));
      putItems(aI); push(() => putItems(bI), () => putItems(aI)); clearSel();
    },
    unlock(id) {
      const b = itemsRef.current.find((x) => x.id === id); if (!b) return;
      const { locked, ...rest } = b.data || {}; void locked;
      const a = { ...b, data: rest };
      putItems([a]); push(() => putItems([b]), () => putItems([a]));
      setLockTip(null); setSel({ s: [], i: [id] });
    },
    del() {
      const S = selStrokes, I = selItems;
      remove(S.map((x) => x.id)); removeItems(I.map((x) => x.id));
      push(() => { add(S); putItems(I); }, () => { remove(S.map((x) => x.id)); removeItems(I.map((x) => x.id)); });
      clearSel();
    },
    dup() {
      const S = selStrokes.map((x) => ({ ...xfStroke(x, { ...ID_T, dx: 30, dy: 30 }), id: uid() }));
      const z = Math.max(0, ...items.map((x) => x.z || 0));
      const I = selItems.map((x, n) => ({ ...xfItem(x, { ...ID_T, dx: 30, dy: 30 }), id: uid(), z: z + n + 1 }));
      add(S); putItems(I);
      push(() => { remove(S.map((x) => x.id)); removeItems(I.map((x) => x.id)); }, () => { add(S); putItems(I); });
      setSel({ s: S.map((x) => x.id), i: I.map((x) => x.id) });
    },
    color(c) {
      const bS = selStrokes, bI = selItems;
      const aS = bS.map((x) => ({ ...x, color: c }));
      const aI = bI.map((x) => ({ ...x, data: x.kind === 'shape' ? { ...x.data, stroke: c } : x.kind === 'sticky' ? { ...x.data, color: c } : x.kind === 'washi' ? { ...x.data, c1: c } : x.data }));
      put(aS); putItems(aI);
      push(() => { put(bS); putItems(bI); }, () => { put(aS); putItems(aI); });
    },
    fill(c) {
      const bI = selItems.filter((x) => x.kind === 'shape');
      const aI = bI.map((x) => ({ ...x, data: { ...x.data, fill: c } }));
      putItems(aI); push(() => putItems(bI), () => putItems(aI));
    },
    layer(dir) {
      const zs = items.map((x) => x.z || 0);
      const base = dir > 0 ? Math.max(0, ...zs) + 1 : Math.min(0, ...zs) - selItems.length - 1;
      const bI = selItems, aI = bI.map((x, n) => ({ ...x, z: base + n }));
      putItems(aI); push(() => putItems(bI), () => putItems(aI));
    },
    sticker() {
      if (!selStrokes.length) return;
      const b = boxOf(selStrokes, []);
      const strokesData = selStrokes.map((s) => ({
        tool: s.tool, color: s.color, size: s.size, opacity: s.opacity, style: s.style, stab: s.stab, thinning: s.thinning,
        points: s.points.map(([x, y, p]) => [r1(x - b.x0), r1(y - b.y0), p]),
      }));
      onSaveSticker && onSaveSticker({ strokes: strokesData, w0: r1(b.x1 - b.x0), h0: r1(b.y1 - b.y0) });
    },
    // Use the selection (ink and/or stickers) as a hand-drawn header for the month, year or a weekday.
    header(key) {
      const S = selStrokes, I = selItems;
      if (!S.length && !I.length) return;
      const b = boxOf(S, I);
      const art = {
        w0: r1(b.x1 - b.x0), h0: r1(b.y1 - b.y0),
        strokes: S.map((s) => ({ tool: s.tool, color: s.color, size: s.size, opacity: s.opacity, style: s.style, stab: s.stab, thinning: s.thinning, points: s.points.map(([x, y, p]) => [r1(x - b.x0), r1(y - b.y0), p]) })),
        items: I.map((it) => ({ ...it, x: r1(it.x - b.x0), y: r1(it.y - b.y0), page_id: undefined })),
      };
      onSaveHeader && onSaveHeader(key, art);
      // The drawing becomes the header, so it leaves this spot (undo brings it back).
      remove(S.map((x) => x.id)); removeItems(I.map((x) => x.id));
      push(() => { add(S); putItems(I); }, () => { remove(S.map((x) => x.id)); removeItems(I.map((x) => x.id)); });
      clearSel(); setHdrPick(false);
    },
    thickness(sw) {
      const bI = selItems.filter((x) => x.kind === 'shape');
      const aI = bI.map((x) => ({ ...x, data: { ...x.data, sw } }));
      putItems(aI);
      if (!thickStart.current) thickStart.current = bI;
    },
    thicknessDone() {
      const bI = thickStart.current; thickStart.current = null;
      if (!bI) return;
      const aI = itemsRef.current.filter((x) => bI.some((b) => b.id === x.id));
      push(() => putItems(bI), () => putItems(aI));
    },
    favShape() { const it = selItems[0]; if (it?.kind === 'shape' && onFavShape) onFavShape({ ...it.data, w: it.w, h: it.h }); },
    text() { const it = selItems[0]; if (it?.kind === 'sticky' || it?.kind === 'text') setEditing({ id: it.id, text: it.data?.text || '' }); },
  };

  /* ---------- pointer handling ---------- */
  function down(e) {
    log(e);
    rc.current = null;
    if (e.pointerType !== 'touch') rc.current = 'want';
    if (e.pointerType === 'pen') {
      lastPen.current = performance.now();
      rewind();
      pan.current = null; touches.current.clear();
    }
    if (!page) return;
    const p = pt(e);
    const gs = g.current;
    if (e.pointerType === 'touch' && (gs?.mode === 'manip' || gs?.mode === 'imanip') && gs.tid != null && gs.tid !== e.pointerId) {
      setOvr(null);
      const its = gs.mode === 'imanip' ? [gs.it0] : selItems, sts = gs.mode === 'imanip' ? [] : selStrokes;
      const b = boxOf(sts, its); if (!b) return;
      const f = new Map([[gs.tid, gs.tpos], [e.pointerId, { x: e.clientX, y: e.clientY }]]);
      const [A, B] = [...f.values()];
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      g.current = { mode: 'selpinch', f, base: { strokes: sts, items: its }, cx, cy,
        d0: Math.hypot(A.x - B.x, A.y - B.y) || 1, a0: Math.atan2(B.y - A.y, B.x - A.x), m0: [(A.x + B.x) / 2, (A.y + B.y) / 2] };
      setTf({ ...ID_T, cx, cy });
      try { svg.current.setPointerCapture(e.pointerId); } catch { /* fine */ }
      return;
    }
    // Grab the current selection with any pointer (pen, mouse, or finger).
    if (tool === 'lasso' && !(e.pointerType === 'touch' && palmy(e))) {
      const h = single ? hitSingle(single, p) : hasSel ? hitSel(p) : null;
      if (h) {
        svg.current.setPointerCapture(e.pointerId);
        if (single) startSingle(h, p, single); else startManip(h, p, { strokes: selStrokes, items: selItems });
        if (e.pointerType === 'touch') { g.current.tid = e.pointerId; g.current.tpos = { x: e.clientX, y: e.clientY }; }
        return;
      }
      const lf = settings.lassoFilter || 'all';
      const hit = (lf === 'all' || lf === 'items') && [...itemsRef.current].sort((a, b) => (b.z || 0) - (a.z || 0)).find((it) => itemHit(it, p));
      if (hit && hit.data?.locked) { setLockTip(hit.id); clearSel(); return; }
      if (hit) {
        svg.current.setPointerCapture(e.pointerId);
        setSel({ s: [], i: [hit.id] }); setColorOpen(false);
        startSingle('move', p, hit);
        if (e.pointerType === 'touch') { g.current.tid = e.pointerId; g.current.tpos = { x: e.clientX, y: e.clientY }; }
        return;
      }
    }
    if (e.pointerType === 'touch') {
      if (palmy(e)) return;
      const sc = scroller(); if (!sc) return;
      if (!touches.current.size && performance.now() - pinchEnd.current < 150 && (e.width || 0) > 30) return;
      cancelAnimationFrame(glide.current);
      if (!touches.current.size) snap.current = { sc, z: zoom.current, l: sc.scrollLeft, t: sc.scrollTop, end: Infinity };
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.current.size === 1) { pressStart(e); tap.current.widget = widgetAt(p); tap.current.p = p; } else tap.current = null;
      startGesture(sc);
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pressStart(e);
    const mode = sideButton(e) && settings.penButton ? 'eraser' : tool;
    if (mode === 'eyedropper') { onPick(pickColor(p)); return; }
    svg.current.setPointerCapture(e.pointerId);
    if (mode === 'lasso') {
      clearSel();
      g.current = { mode: 'lasso', pts: [p] };
      setLive();
      return;
    }
    if (mode === 'washi') { g.current = { mode: 'washi', a: p, b: p }; setLive(); return; }
    if (mode === 'pointer') { const w = widgetAt(p); if (w) widgetTap(w, p); return; }
    if (mode === 'text') {
      // Tap an existing text box to edit it, or tap empty space to start a new one there.
      const hit = [...itemsRef.current].filter((x) => x.kind === 'text').sort((a, b) => (b.z || 0) - (a.z || 0)).find((it) => itemHit(it, p));
      if (hit) { setEditing({ id: hit.id, text: hit.data?.text || '' }); return; }
      const z = Math.max(0, ...itemsRef.current.map((x) => x.z || 0)) + 1;
      const it = { id: uid(), page_id: page.id, kind: 'text', x: r1(p[0]), y: r1(p[1] - 20), w: 460, h: 60, rot: 0, z,
        data: { text: '', size: settings.textSize || 28, color: settings.pen.color, font: settings.textFont || 'hand' } };
      putItems([it]);
      setEditing({ id: it.id, text: '', isNew: true });
      return;
    }
    if ((mode === 'pen' || mode === 'highlighter') && widgetAt(p)) { g.current = { mode: 'wtap', it: widgetAt(p), p, draw: mode }; return; }
    if (mode === 'eraser') { startEraser(p); return; }
    if (mode !== 'pen' && mode !== 'highlighter') return;
    const cfg = settings[mode];
    g.current = { mode, cfg, pts: [p], anchor: p, timer: null, snapped: null };
    setLive();
    armSnap();
  }

  // Tracker hover (mouse, or the pointer tool): show a soft preview of what a click would mark.
  const [hov, setHov] = useState(null);
  function hoverAt(e) {
    if (g.current || e.buttons || !(e.pointerType === 'mouse' || tool === 'pointer') || e.pointerType === 'touch') { if (hov) setHov(null); return; }
    const p = pt(e), it = widgetAt(p);
    if (!it) { if (hov) setHov(null); return; }
    const [x, y] = widgetLocal(it, p);
    const res = WIDGETS[it.data.type]?.tap(it.data, x, y);
    const data = res && res.pickMood === undefined ? res : null;
    const key = it.id + JSON.stringify(data);
    if (hov?.key !== key) setHov(data ? { key, it: { ...it, data } } : { key, it: null, id: it.id });
  }
  // Eraser ring: shows exactly how much the eraser covers, while hovering and while erasing.
  const ring = useRef();
  function showRing(e) {
    const el = ring.current; if (!el) return;
    const on = e.pointerType !== 'touch' && (tool === 'eraser' || g.current?.mode === 'eraser');
    if (!on) { el.setAttribute('visibility', 'hidden'); return; }
    const [x, y] = pt(e);
    el.setAttribute('cx', x); el.setAttribute('cy', y + yo(y)); el.setAttribute('r', settings.eraser.size);
    el.setAttribute('stroke-width', 1.6 * pxToUnits());
    el.setAttribute('visibility', 'visible');
  }
  useEffect(() => { if (tool !== 'eraser') ring.current?.setAttribute('visibility', 'hidden'); }, [tool]);
  function move(e) {
    log(e);
    if (tap.current) pressMove(e);
    if (e.pointerType === 'pen') { if (e.buttons) lastPen.current = performance.now(); else lastHover.current = performance.now(); if (snap.current) rewind(); }
    showRing(e);
    hoverAt(e);
    const s = g.current;
    if (s?.mode === 'selpinch') {
      if (!s.f.has(e.pointerId)) return;
      s.f.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [A, B] = [...s.f.values()], u = pxToUnits();
      let rot = ((Math.atan2(B.y - A.y, B.x - A.x) - s.a0) * 180) / Math.PI;
      const near = Math.round(rot / 45) * 45; if (Math.abs(rot - near) < 4) rot = near;
      setTf({ ...ID_T, cx: s.cx, cy: s.cy, k: Math.max(0.05, Math.hypot(A.x - B.x, A.y - B.y) / s.d0), rot,
        dx: ((A.x + B.x) / 2 - s.m0[0]) * u, dy: ((A.y + B.y) / 2 - s.m0[1]) * u });
      return;
    }
    if (s?.mode === 'manip') { if (s.tid === e.pointerId) s.tpos = { x: e.clientX, y: e.clientY }; manipMove(pt(e)); return; }
    if (s?.mode === 'imanip') { if (s.tid === e.pointerId) s.tpos = { x: e.clientX, y: e.clientY }; singleMove(pt(e)); return; }
    if (e.pointerType === 'touch') {
      if (s || !touches.current.has(e.pointerId)) return;
      touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pn = pan.current; if (!pn) return;
      const ts = [...touches.current.values()];
      if (pn.mode === 'pan') {
        if (!pn.go) { if (Math.hypot(ts[0].x - pn.sx, ts[0].y - pn.sy) < (zoom.current > 1.5 ? 12 : 4)) return; pn.go = true; pn.sx = ts[0].x; pn.sy = ts[0].y; }
        pn.sc.scrollLeft = pn.left - (ts[0].x - pn.sx);
        pn.sc.scrollTop = pn.top - (ts[0].y - pn.sy);
        const now = performance.now();
        (pn.trail ||= []).push([now, ts[0].x, ts[0].y]);
        while (pn.trail.length > 2 && now - pn.trail[0][0] > 90) pn.trail.shift();
      } else if (ts.length >= 2 && pn.sc.classList.contains('pmain')) {
        const [a, b] = ts, r = pn.sc.getBoundingClientRect();
        const z = Math.min(5, Math.max(0.7, (pn.z * Math.hypot(a.x - b.x, a.y - b.y)) / pn.d));
        void r;
        pn.zNow = z; pn.mLast = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const el = zEl();
        el.style.transformOrigin = `${pn.ox}px ${pn.oy}px`;
        el.style.transform = `translate(${pn.mLast.x - pn.m0.x}px, ${pn.mLast.y - pn.m0.y}px) scale(${z / pn.z})`;
      }
      return;
    }
    if (!s) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    const list = evs.length ? evs : [e];
    if (s.mode === 'wtap') {
      const q = pt(e);
      if (Math.hypot(q[0] - s.p[0], q[1] - s.p[1]) > 9 * pxToUnits()) {
        const cfg = settings[s.draw];
        g.current = { mode: s.draw, cfg, pts: [s.p, q], anchor: q, timer: null, snapped: null };
        setLive(); armSnap();
      }
      return;
    }
    if (s.mode === 'lasso') { list.forEach((ev) => s.pts.push(pt(ev))); setLive(); return; }
    if (s.mode === 'washi') { s.b = pt(e); setLive(); return; }
    if (s.mode === 'eraser') { list.forEach((ev) => eraseAt(pt(ev))); return; }
    const p = pt(e);
    if (s.snapped) {
      if (s.snapped.kind === 'line') { s.pts = densify(s.pts[0], p); setLive(); }
      return;
    }
    for (const ev of list) {
      const q = pt(ev), last = s.pts[s.pts.length - 1];
      if (last && Math.hypot(q[0] - last[0], q[1] - last[1]) < 0.35) continue; // same spot twice = jitter
      if (ev.pointerType === 'pen' && last) q[2] = r1(last[2] * 0.6 + q[2] * 0.4); // S Pen pressure flickers; steady it
      s.pts.push(q);
    }
    // Where the pen is about to be: drawn live only (never saved), so the ink keeps up with the nib.
    // Where the pen is about to be: drawn live only (never saved), so the ink keeps up with the nib.
    const pr = e.getPredictedEvents ? e.getPredictedEvents() : [];
    s.pred = pr.length ? pr.slice(0, 2).map((ev) => { const q = pt(ev); q[2] = s.pts[s.pts.length - 1]?.[2] ?? q[2]; return q; }) : null;
    setLive();
    if (s.mode !== 'mask' && Math.hypot(p[0] - s.anchor[0], p[1] - s.anchor[1]) > 6) { s.anchor = p; armSnap(); }
  }

  // Writing assist: strokes written on one line are collected; a moment after you stop, the line is leveled.
  const lastSt = useRef(null);
  const wa = useRef({ list: [], timer: 0, skip: new Set() });
  const guide = useRef();
  const showGuide = (x0, x1, y) => {
    const el = guide.current; if (!el) return;
    el.setAttribute('x1', x0); el.setAttribute('x2', x1); el.setAttribute('y1', y); el.setAttribute('y2', y);
    el.setAttribute('stroke-width', 1.5 * pxToUnits()); el.setAttribute('stroke-dasharray', `${6 * pxToUnits()} ${5 * pxToUnits()}`);
    el.setAttribute('visibility', 'visible');
  };
  const hideGuide = () => guide.current?.setAttribute('visibility', 'hidden');
  // The row stays "open" while you keep writing on it (pauses included), and each pass re-levels the
  // whole row so far, so a row written in bursts still ends up on one straight line.
  function assistFlush(final) {
    const w = wa.current; clearTimeout(w.timer);
    if (g.current) { w.timer = setTimeout(() => assistFlush(final), 400); return; } // never move things mid-stroke
    const live = w.list.map((x) => strokesRef.current.find((s) => s.id === x.id)).filter((s) => s && !w.skip.has(s.id));
    w.list = final ? [] : live;
    const res = straighten(live);
    if (res) {
      put(res.strokes);
      // Undo puts the writing back as you wrote it, and assist then leaves those strokes alone.
      push(() => { put(live); live.forEach((s) => w.skip.add(s.id)); w.list = w.list.filter((x) => !w.skip.has(x.id)); }, () => put(res.strokes));
      if (!final) { const byId = new Map(res.strokes.map((s) => [s.id, s])); w.list = live.map((s) => byId.get(s.id) || s); }
      showGuide(res.x0 - res.h * 0.5, res.x1 + res.h * 6, res.y);
    }
    setTimeout(() => { if (performance.now() - w.last > 2500) hideGuide(); }, 2600);
  }
  function assistAdd(st) {
    const w = wa.current;
    const boxes = w.list.map(bbox), b = bbox(st);
    // A new row (or a long break) closes the old one.
    if (w.list.length && (!sameLine(boxes, b) || performance.now() - (w.last || 0) > 20000)) assistFlush(true);
    w.last = performance.now();
    w.list.push(st);
    const bl = w.list.length >= 2 && baseline(w.list.map(bbox));
    if (bl) {
      const all = w.list.map(bbox), x0 = Math.min(...all.map((q) => q.x0)), x1 = Math.max(...all.map((q) => q.x1));
      showGuide(x0 - bl.h * 0.5, x1 + bl.h * 6, bl.at(x0));
    }
    clearTimeout(w.timer);
    w.timer = setTimeout(() => assistFlush(false), 2600);
  }
  useEffect(() => { wa.current.list = []; clearTimeout(wa.current.timer); hideGuide(); }, [page?.id]);

  function finishStroke(s) {
    clearTimeout(s.timer);
    cancelAnimationFrame(raf.current); raf.current = 0;
    if (livePath.current) livePath.current.setAttribute('d', '');
    const pts = s.pts.length > 1 ? s.pts : [s.pts[0], [s.pts[0][0] + 0.5, s.pts[0][1], s.pts[0][2]]];
    let style = s.mode === 'pen' ? (s.cfg.type || 'ballpoint') : s.cfg.taper ? 'tapered' : null;
    if (s.mode === 'mask') {
      const r0 = s.cfg.size / 2, xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      const bx0 = Math.min(...xs) - r0, bx1 = Math.max(...xs) + r0, by0 = Math.min(...ys) - r0, by1 = Math.max(...ys) + r0;
      const hit = strokesRef.current.filter((st) => st.tool !== 'mask' && (s.filter === 'all' || st.tool === s.filter)
        && st.points.some((q) => q[0] > bx0 - st.size && q[0] < bx1 + st.size && q[1] > by0 - st.size && q[1] < by1 + st.size)
        && pts.some((q) => hits(st, q, r0)));
      if (!hit.length) { setLive(); return null; }
      style = 'm:' + hit.map((x) => x.id).join(',');
    }
    const st = { id: uid(), page_id: page.id, tool: s.mode, color: s.cfg.color, size: s.cfg.size, opacity: s.cfg.opacity,
      thinning: s.mode === 'pen' ? (s.cfg.sensitivity ?? 0.8) : 0, style, stab: stabOf(s.mode, s.cfg), points: pts };
    add([st]);
    push(() => remove([st.id]), () => add([st]), [st.id]);
    lastSt.current = st;
    return st.id;
  }

  function up(e) {
    if (e) log(e);
    rc.current = null;
    const s = g.current;
    if (s?.mode === 'selpinch') { g.current = null; manipEnd(s); return; }
    if (s?.mode === 'manip') { g.current = null; manipEnd(s); return; }
    if (s?.mode === 'imanip') { g.current = null; singleEnd(s); return; }
    if (e?.pointerType === 'touch') {
      const tw = tap.current;
      if (tool === 'eyedropper' && tw && !tw.moved && e.type === 'pointerup' && touches.current.size === 1 && performance.now() - tw.t < 500) { tap.current = null; onPick(pickColor(tw.p)); }
      else if (tw?.widget && !tw.moved && e.type === 'pointerup' && performance.now() - tw.t < 400 && tool !== 'lasso') { tap.current = null; widgetTap(tw.widget, tw.p); }
      else if (touches.current.has(e.pointerId) && touches.current.size === 1 && e.type === 'pointerup') pressEnd(e); else tap.current = null;
      if (pan.current?.mode === 'pinch') { pinchEnd.current = performance.now(); pinchCommit(pan.current); }
      if (pan.current?.mode === 'pan' && touches.current.size === 1 && pan.current.trail?.length > 1) {
        const tr = pan.current.trail, a = tr[0], b = tr[tr.length - 1], dt = Math.max(16, b[0] - a[0]);
        let vx = (b[1] - a[1]) / dt, vy = (b[2] - a[2]) / dt;
        const sc = pan.current.sc;
        if (performance.now() - b[0] < 60 && Math.hypot(vx, vy) > 0.15) {
          let last = performance.now();
          const step = (t) => {
            const d = t - last; last = t;
            sc.scrollLeft -= vx * d; sc.scrollTop -= vy * d;
            vx *= Math.pow(0.94, d / 16); vy *= Math.pow(0.94, d / 16);
            if (Math.hypot(vx, vy) > 0.02) glide.current = requestAnimationFrame(step);
          };
          glide.current = requestAnimationFrame(step);
        }
      }
      touches.current.delete(e.pointerId);
      if (!touches.current.size && snap.current) snap.current.end = performance.now();
      const sc = scroller();
      if (touches.current.size && sc && pan.current?.mode !== 'pinch') startGesture(sc); else if (!touches.current.size) pan.current = null;
      return;
    }
    if (e?.pointerType === 'pen') lastPen.current = performance.now();
    g.current = null;
    if (!s) { if (e && e.type === 'pointerup') pressEnd(e); return; }
    if (s.mode === 'wtap') { tap.current = null; widgetTap(s.it, s.p); return; }
    if (s.mode === 'lasso') {
      setLive();
      const poly = s.pts;
      if (poly.length < 3) { if (e?.type === 'pointerup') pressEnd(e); return; }
      const lf = settings.lassoFilter || 'all';
      const S = lf === 'items' ? [] : strokesRef.current.filter((st) => st.tool !== 'mask' && (lf === 'all' || st.tool === lf) && st.points.filter((q) => inPoly(q, poly)).length >= st.points.length * 0.6).map((x) => x.id);
      const I = lf === 'all' || lf === 'items' ? itemsRef.current.filter((it) => !it.data?.locked && inPoly([it.x + it.w / 2, it.y + it.h / 2], poly)).map((x) => x.id) : [];
      setSel({ s: S, i: I });
      return;
    }
    if (s.mode === 'washi') {
      setLive();
      const [ax, ay] = s.a, [bx, by] = s.b, L = Math.hypot(bx - ax, by - ay);
      if (L < 20 || !washi) return;
      const th = washi.width || 46;
      const z = Math.max(0, ...itemsRef.current.map((x) => x.z || 0)) + 1;
      const it = { id: uid(), page_id: page.id, kind: 'washi', x: r1((ax + bx) / 2 - L / 2), y: r1((ay + by) / 2 - th / 2), w: r1(L), h: th,
        rot: r1((Math.atan2(by - ay, bx - ax) * 180) / Math.PI), z, data: { pattern: washi.pattern, c1: washi.c1, c2: washi.c2 } };
      putItems([it]);
      push(() => removeItems([it.id]), () => putItems([it]));
      return;
    }
    if (s.mode === 'eraser') {
      if (s.added.length || s.removed.length) {
        const A = s.added, R = s.removed;
        persist(A, R.map((x) => x.id));
        push(() => { remove(A.map((x) => x.id)); add(R); }, () => { remove(R.map((x) => x.id)); add(A); });
      }
      if (e && e.type === 'pointerup') pressEnd(e); else tap.current = null;
      return;
    }
    // Pen bounce: when writing fast the nib can kiss the glass again for a split second right after lifting,
    // which leaves a stray dot. Drop those (a real dot is a longer, deliberate tap).
    const now = performance.now(), tp = tap.current, lu = lastUp.current;
    if (e?.pointerType === 'pen' && tp && !tp.moved && now - tp.t < 45 && lu && tp.t - lu.t < 220 && Math.hypot(e.clientX - lu.x, e.clientY - lu.y) < 30) {
      clearTimeout(s.timer); cancelAnimationFrame(raf.current); raf.current = 0;
      if (livePath.current) livePath.current.setAttribute('d', '');
      // A real second tap comes a beat after the first lift; a bounce comes almost instantly. Only the real one counts.
      if (e.type === 'pointerup' && tp.t - lu.t > 90) pressEnd(e, []); else { tap.current = null; lastTap.current = null; }
      return;
    }
    const id = finishStroke(s);
    if (settings.writeAssist && s.mode === 'pen' && !s.snapped && lastSt.current?.id === id) assistAdd(lastSt.current);
    if (e?.pointerType === 'pen') lastUp.current = { t: now, x: e.clientX, y: e.clientY };
    if (e && e.type === 'pointerup') pressEnd(e, id ? [id] : []); else tap.current = null;
  }

  // Some phones report the S Pen button as a "right-click" instead.
  function onMenu(e) {
    // Android fires this on a long press (holding the pen still while coloring), so it must never erase.
    e.preventDefault(); log(e);
  }

  /* ---------- drawing ---------- */
  const light = isLight(paperColor);
  const lineCol = light ? 'rgba(61,49,33,0.13)' : 'rgba(242,232,218,0.12)';
  const pid = 'pp-' + (page?.id || 'x');
  const selKey = sel.s.join(',');
  const maskBy = useMemo(() => {
    const m = {};
    for (const s of strokes) if (s.tool === 'mask' && s.style?.startsWith('m:')) for (const id of s.style.slice(2).split(',')) (m[id] ||= []).push(s);
    return m;
  }, [strokes]);
  const mk = (s) => (maskBy[s.id] ? `url(#${pid}-k-${s.id})` : undefined);
  const inked = useMemo(() => {
    const free = strokes.filter((s) => !sel.s.includes(s.id));
    const sh = (s) => { if (!ymap) return undefined; let a = Infinity, b = -Infinity; for (const p of s.points) { if (p[1] < a) a = p[1]; if (p[1] > b) b = p[1]; } return `translate(0 ${ymap.off((a + b) / 2)})`; };
    return (
      <>
        <defs>
          {Object.entries(maskBy).map(([id, list]) => (
            <mask key={id} id={`${pid}-k-${id}`} maskUnits="userSpaceOnUse" x="-200" y="-200" width={W + 400} height={H * sheets + 400}>
              <rect x="-200" y="-200" width={W + 400} height={H * sheets + 400} fill="#fff" />
              {list.map((m) => <path key={m.id} d={pathFor(m)} fill="#000" />)}
            </mask>
          ))}
        </defs>
        <g style={{ mixBlendMode: light ? 'multiply' : 'normal' }}>
          {free.filter((s) => s.tool === 'highlighter').map((s) => <path key={s.id} d={pathFor(s)} fill={s.color} opacity={s.opacity} mask={mk(s)} transform={sh(s)} />)}
        </g>
        {free.filter((s) => s.tool === 'pen' && s.style !== 'pencil').map((s) => <path key={s.id} d={pathFor(s)} fill={s.color} opacity={s.opacity} mask={mk(s)} transform={sh(s)} />)}
        <g filter={`url(#${pid}-pencil)`} opacity=".88">{free.filter((s) => s.tool === 'pen' && s.style === 'pencil').map((s) => <path key={s.id} d={pathFor(s)} fill={s.color} opacity={s.opacity} mask={mk(s)} transform={sh(s)} />)}</g>
      </>
    );
  }, [strokes, light, selKey, maskBy, ymap]);
  const t = tf || ID_T;
  const tfAttr = t.cx != null
    ? `translate(${t.dx} ${t.dy}) translate(${t.cx} ${t.cy}) rotate(${t.rot || 0}) scale(${t.k}) translate(${-t.cx} ${-t.cy})`
    : `translate(${t.dx} ${t.dy}) translate(${t.ox} ${t.oy}) scale(${t.k}) translate(${-t.ox} ${-t.oy})`;
  const sortedItems = [...view].sort((a, b) => (a.z || 0) - (b.z || 0));
  const hr = 22 * pxToUnits();
  const cursor = tool === 'pointer' ? 'default' : tool === 'text' ? 'text' : tool === 'eyedropper' ? 'crosshair' : tool === 'eraser' ? 'cell' : tool === 'lasso' ? 'default' : 'crosshair';
  const palette = (settings.palettes[settings.activePalette] || settings.palettes[0]).colors;
  const showBar = hasSel && box && !tf && !ovr;
  const editIt = editing && items.find((x) => x.id === editing.id);

  // Page sorter: pages are stacked bands of the same drawing, so reordering shifts strokes and items by whole pages.
  const sheetOfS = (st) => Math.max(0, Math.min(sheets - 1, Math.floor((st.points[0]?.[1] || 0) / H)));
  const sheetOfI = (it) => Math.max(0, Math.min(sheets - 1, Math.floor((it.y + it.h / 2) / H)));
  const shiftS = (st, d) => ({ ...st, points: st.points.map(([x, y, pr]) => [x, r1(y + d), pr]) });
  function reorderSheets(order) {
    const at = (k) => order.indexOf(k);
    const mS = strokes.filter((x) => at(sheetOfS(x)) !== sheetOfS(x)), mI = items.filter((x) => at(sheetOfI(x)) !== sheetOfI(x));
    const aS = mS.map((x) => shiftS(x, (at(sheetOfS(x)) - sheetOfS(x)) * H)), aI = mI.map((x) => ({ ...x, y: r1(x.y + (at(sheetOfI(x)) - sheetOfI(x)) * H) }));
    if (aS.length) put(aS); if (aI.length) putItems(aI);
    push(() => { if (mS.length) put(mS); if (mI.length) putItems(mI); }, () => { if (aS.length) put(aS); if (aI.length) putItems(aI); });
  }
  function moveSheet(k, d) {
    const j = k + d; if (j < 0 || j >= sheets) return;
    const order = [...Array(sheets).keys()]; order.splice(k, 1); order.splice(j, 0, k);
    reorderSheets(order); clearSel();
  }
  function deleteSheet(k) {
    if (sheets <= 1) return;
    if (!confirm(`Delete page ${k + 1} and everything on it?`)) return;
    const gS = strokes.filter((x) => sheetOfS(x) === k), gI = items.filter((x) => sheetOfI(x) === k);
    const bS = strokes.filter((x) => sheetOfS(x) > k), bI = items.filter((x) => sheetOfI(x) > k);
    remove(gS.map((x) => x.id)); removeItems(gI.map((x) => x.id));
    if (bS.length) put(bS.map((x) => shiftS(x, -H))); if (bI.length) putItems(bI.map((x) => ({ ...x, y: r1(x.y - H) })));
    onAddSheet(sheets - 1);
    undo.current = []; redo.current = []; clearSel();
    setCurSheet(Math.min(cs, sheets - 2));
  }
  function goSheet(k) {
    setSorter(false);
    if (paged) { setCurSheet(k); return; }
    const sc = scroller(); if (!sc || !svg.current) return;
    const r = svg.current.getBoundingClientRect(), sr = sc.getBoundingClientRect();
    sc.scrollTo({ top: sc.scrollTop + (r.top - sr.top) + (k * r.height) / sheets, behavior: 'smooth' });
  }
  const isPhone = typeof window !== 'undefined' && !window.matchMedia('(min-width: 1000px)').matches;

  return (
    <div className={'csheet' + (sp ? ' spread' : '') + (fit && paged && !sp ? ' fit' : '')} ref={sheet} style={sp || fit ? { '--ar': VW / vh } : undefined}>
      <div className="cpage">
      <svg ref={svg} viewBox={`0 ${vy0} ${VW} ${vh}`} onPointerDown={down} onPointerMove={move} onPointerUp={up}
        onPointerCancel={up} onPointerLeave={() => { ring.current?.setAttribute('visibility', 'hidden'); setHov(null); }} onContextMenu={onMenu} onAuxClick={log} style={{ cursor: tool === 'eraser' ? 'none' : hov ? 'pointer' : cursor }}>
        <defs>
          {paperStyle === 'grid' && <pattern id={pid} width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke={lineCol} strokeWidth="1.5" /></pattern>}
          {paperStyle === 'lined' && <pattern id={pid} width={W} height="44" patternUnits="userSpaceOnUse"><path d={`M0 43H${W}`} stroke={lineCol} strokeWidth="1.5" /></pattern>}
          <filter id={pid + '-pencil'} x="-2%" y="-2%" width="104%" height="104%">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.5" result="a" />
            <feComposite in="SourceGraphic" in2="a" operator="in" />
          </filter>
          {paperStyle === 'dots' && <pattern id={pid} width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="18" cy="18" r="2.4" fill={lineCol} /></pattern>}
          {sp && <>
            <clipPath id={pid + '-cl'}><rect x="0" y={vy0} width={W} height={H} /></clipPath>
            <clipPath id={pid + '-cr'}><rect x="0" y={vy0 + H} width={W} height={H} /></clipPath>
            <linearGradient id={pid + '-gut'} x1="0" x2="1"><stop offset="0" stopColor="#000" stopOpacity=".28" /><stop offset=".5" stopColor="#000" stopOpacity=".08" /><stop offset="1" stopColor="#000" stopOpacity=".28" /></linearGradient>
            <linearGradient id={pid + '-shl'} x1="0" x2="1"><stop offset="0" stopColor="#3d3121" stopOpacity="0" /><stop offset="1" stopColor="#3d3121" stopOpacity=".14" /></linearGradient>
            <linearGradient id={pid + '-shr'} x1="0" x2="1"><stop offset="0" stopColor="#3d3121" stopOpacity=".14" /><stop offset="1" stopColor="#3d3121" stopOpacity="0" /></linearGradient>
          </>}
        </defs>
        <g clipPath={sp ? `url(#${pid}-cl)` : undefined}><g id={pid + '-c'}>
        {!overlay && <rect width={W} height={H * sheets} fill={paperColor} />}
        {!overlay && paperStyle !== 'blank' && <rect width={W} height={H * sheets} fill={`url(#${pid})`} />}
        {!overlay && !paged && Array.from({ length: sheets }, (_, k) => <rect key={k} x="2" y={k * H + 2} width={W - 4} height={H - 4} fill="none" stroke={light ? 'rgba(61,49,33,0.32)' : 'rgba(242,232,218,0.28)'} strokeWidth="4" />)}
        {under}
        {Array.from({ length: sheets - 1 }, (_, k) => <rect key={'g' + k} x="0" y={(k + 1) * H - 3} width={W} height="6" fill={light ? 'rgba(61,49,33,0.22)' : 'rgba(0,0,0,0.35)'} />)}
        {sortedItems.filter((it) => !sel.i.includes(it.id)).map((it) => ymap ? <g key={it.id} transform={`translate(0 ${yo(it.y + it.h / 2)})`}><ItemView it={it} /></g> : <ItemView key={it.id} it={it} />)}
        {hov?.it && <g opacity=".45" pointerEvents="none" transform={ymap ? `translate(0 ${yo(hov.it.y + hov.it.h / 2)})` : undefined}><ItemView it={{ ...hov.it, data: { ...hov.it.data, bg: 'none' } }} /></g>}
        {inked}
        <g transform={ymap && box ? `translate(0 ${yo((box.y0 + box.y1) / 2)})` : undefined}><g transform={tfAttr}>
          {sortedItems.filter((it) => sel.i.includes(it.id)).map((it) => <ItemView key={it.id} it={it} />)}
          {selStrokes.map((s) => <path key={s.id} d={pathFor(s)} fill={s.color} opacity={s.opacity} mask={mk(s)} />)}
          {single && (() => {
            const it = single, u = pxToUnits(), cx = it.x + it.w / 2, cy = it.y + it.h / 2;
            const hd = (x, y, k) => <rect key={k} x={x - hr * 0.42} y={y - hr * 0.42} width={hr * 0.84} height={hr * 0.84} rx={hr * 0.2} fill="#fffaf1" stroke="#6f8f62" strokeWidth={3 * u} />;
            const px = roomy(it.w) + 4, py = roomy(it.h) + 4;
            return (
              <g pointerEvents="none" transform={`rotate(${it.rot || 0} ${cx} ${cy})`}>
                <rect x={it.x - px} y={it.y - py} width={it.w + 2 * px} height={it.h + 2 * py} rx={6 * u} fill="rgba(111,143,98,0.06)" stroke="#6f8f62" strokeWidth={2 * u} strokeDasharray={`${8 * u} ${6 * u}`} />
                {hd(it.x + it.w + px - 4, it.y + it.h / 2, 'w')}
                {hd(it.x + it.w / 2, it.y + it.h + py - 4, 'h')}
                <circle cx={it.x + it.w + px - 4} cy={it.y + it.h + py - 4} r={hr * 0.6} fill="#fffaf1" stroke="#6f8f62" strokeWidth={3 * u} />
                <path d={`M${cx} ${it.y - py}V${it.y - py + 4 - hr * 2.2}`} stroke="#6f8f62" strokeWidth={2 * u} />
                <circle cx={cx} cy={it.y - py + 4 - hr * 2.2} r={hr * 0.55} fill="#6f8f62" />
              </g>
            );
          })()}
          {box && !single && (
            <g pointerEvents="none">
              {(() => {
                const u = pxToUnits(), px = roomy(box.x1 - box.x0), py = roomy(box.y1 - box.y0), mx = (box.x0 + box.x1) / 2;
                return <>
                  <rect x={box.x0 - px - 6} y={box.y0 - py - 6} width={box.x1 - box.x0 + 2 * px + 12} height={box.y1 - box.y0 + 2 * py + 12} rx={6 * u} fill="rgba(111,143,98,0.06)"
                    stroke="#6f8f62" strokeWidth={2 * u} strokeDasharray={`${8 * u} ${6 * u}`} />
                  <circle cx={box.x1 + px} cy={box.y1 + py} r={hr * 0.6} fill="#fffaf1" stroke="#6f8f62" strokeWidth={3 * u} />
                  <path d={`M${mx} ${box.y0 - py - 6}V${box.y0 - py - hr * 2.2}`} stroke="#6f8f62" strokeWidth={2 * u} />
                  <circle cx={mx} cy={box.y0 - py - hr * 2.2} r={hr * 0.55} fill="#6f8f62" />
                </>;
              })()}
            </g>
          )}
        </g>
        </g>
        <g ref={liveG}>
        <line ref={guide} stroke="#6f8f62" strokeOpacity=".55" visibility="hidden" pointerEvents="none" />
        <path ref={livePath} d="" />
        <path ref={lassoPath} d="" fill="rgba(111,143,98,0.08)" stroke="#6f8f62" strokeWidth={3 * pxToUnits()} strokeDasharray={`${8 * pxToUnits()} ${6 * pxToUnits()}`} pointerEvents="none" />
        </g>
        <circle ref={ring} r="10" fill="rgba(255,255,255,0.25)" stroke="#3d3121" strokeOpacity=".7" visibility="hidden" pointerEvents="none" />
        </g></g>
        {sp && <>
          {hasRight
            ? <use href={`#${pid}-c`} transform={`translate(${W + GAP} ${-H})`} clipPath={`url(#${pid}-cr)`} />
            : <g pointerEvents="none">
                <rect x={W + GAP} y={vy0} width={W} height={H} fill={paperColor} />
                {paperStyle !== 'blank' && <rect x={W + GAP} y={vy0} width={W} height={H} fill={`url(#${pid})`} opacity=".6" />}
              </g>}
          <g pointerEvents="none">
            <rect x={W} y={vy0} width={GAP} height={H} fill={`url(#${pid}-gut)`} />
            <rect x={W - 70} y={vy0} width="70" height={H} fill={`url(#${pid}-shl)`} />
            <rect x={W + GAP} y={vy0} width="70" height={H} fill={`url(#${pid}-shr)`} />
          </g>
        </>}
      </svg>
      {sp && onAddSheet && left + 2 >= sheets && (
        <button className={'addpage' + (hasRight ? ' corner' : '')} style={hasRight ? undefined : { left: ((W * 1.5 + GAP) / VW) * 100 + '%' }}
          onPointerDown={(e) => e.stopPropagation()} onClick={() => { onAddSheet(sheets + 1); if (hasRight) setCurSheet(sheets); }}>
          <span className="pl">+</span>{!hasRight && <span>Add a page</span>}
        </button>
      )}

      {lockTip && tool === 'lasso' && (() => {
        const it = view.find((x) => x.id === lockTip); if (!it) return null;
        const [bx, by] = tv(it.x + it.w / 2, it.y);
        return (
          <div className="selbar locktip" style={{ left: `calc(${(bx / VW) * 100}% - 60px)`, top: `calc(${((by - vy0) / vh) * 100}% - 52px)` }} onPointerDown={(e) => e.stopPropagation()}>
            <span>🔒 Locked</span><button className="sbtn primary" onClick={() => act.unlock(it.id)}>Unlock</button>
          </div>
        );
      })()}
      {showBar && (
        <div className="selbar" style={(() => {
          const [bx, by0] = tv(box.x0, box.y0), by1 = by0 + (box.y1 - box.y0), py = roomy(box.y1 - box.y0);
          // Sits above the rotate handle (never on top of it). Near the top of the page it goes under the selection instead.
          const above = by0 - py - vy0;
          return { left: Math.max(0, (bx / VW) * 100) + '%',
            top: above < 130 * pxToUnits() ? `calc(${((by1 + py - vy0) / vh) * 100}% + 26px)` : `calc(${(above / vh) * 100}% - 120px)` };
        })()}
          onPointerDown={(e) => e.stopPropagation()}>
          {selStrokes.length > 0 && <button className="sbtn primary" onClick={act.sticker}><Icon n="star" s={16} /> Save as sticker</button>}
          {onSaveHeader && headerCtx && <button className="sbtn" onClick={() => setHdrPick(true)}>Use as header</button>}
          {selItems.length === 1 && (selItems[0].kind === 'sticky' || selItems[0].kind === 'text') && <button className="sbtn" onClick={act.text}>Edit text</button>}
          {selItems.length === 1 && selItems[0].kind === 'widget' && <button className="sbtn" onClick={() => setWEdit(selItems[0])}>Edit</button>}
          <button className="sbtn" aria-label="Color" title="Color" onClick={() => setColorOpen((v) => !v)}><span className="cdot" style={{ background: selStrokes[0]?.color || selItems[0]?.data?.stroke || selItems[0]?.data?.color || selItems[0]?.data?.c1 || '#3d3121' }} /></button>
          {selItems.length > 0 && <>
            <button className="sbtn" title="Bring to front" aria-label="Bring to front" onClick={() => act.layer(1)}>↑</button>
            <button className="sbtn" title="Send to back" aria-label="Send to back" onClick={() => act.layer(-1)}>↓</button>
          </>}
          <button className="sbtn" title="Duplicate" aria-label="Duplicate" onClick={act.dup}>⧉</button>
          {selItems.length > 0 && <button className="sbtn" title="Lock in place" aria-label="Lock in place" onClick={act.lock}>🔒</button>}
          <button className="sbtn danger" title="Delete" aria-label="Delete" onClick={act.del}><Icon n="trash" s={16} /></button>
          {selItems.length === 1 && selItems[0].kind === 'shape' && <button className="sbtn" title="Save this shape as a favorite" aria-label="Save shape as favorite" onClick={act.favShape}><Icon n="star" s={16} /></button>}
          {colorOpen && (() => {
            const shape = selItems.find((x) => x.kind === 'shape');
            const cur = selStrokes[0]?.color || shape?.data?.stroke || selItems[0]?.data?.color || selItems[0]?.data?.c1;
            const fill = shape?.data?.fill || 'none';
            return (
              <div className="selcolors">
                <span className="lbl" style={{ width: '100%', margin: 0 }}>{shape ? 'OUTLINE' : 'COLOR'}</span>
                {palette.map((c) => <button key={c} className={'sw' + (cur === c ? ' on' : '')} style={{ background: c }} aria-label={'Color ' + c} onClick={() => act.color(c)} />)}
                {shape && <>
                  <span className="lbl" style={{ width: '100%', margin: '4px 0 0' }}>FILL</span>
                  <button className={'sw none' + (fill === 'none' ? ' on' : '')} aria-label="No fill" onClick={() => act.fill('none')}>×</button>
                  {palette.map((c) => <button key={'f' + c} className={'sw' + (fill === c ? ' on' : '')} style={{ background: c }} aria-label={'Fill ' + c} onClick={() => act.fill(c)} />)}
                  <label className="slider" style={{ width: '100%', marginTop: 6 }}>Outline thickness <span>{shape.data?.sw || 4}</span>
                    <input type="range" min="0" max="20" value={shape.data?.sw ?? 4}
                      onChange={(e) => act.thickness(+e.target.value)} onPointerUp={act.thicknessDone} onKeyUp={act.thicknessDone} />
                  </label>
                </>}
              </div>
            );
          })()}
        </div>
      )}

      </div>
      {DEBUG && <pre className="dbg" ref={dbg} />}
      {isPhone && !focus && !overlay && !(zpct > 115 && !settings.zdockHidden) && (
        <button className="zoompill" aria-label="Zoom level, tap to change" onClick={cycleZoom}>{zpct}%</button>
      )}
      {/* Week page decorating on a phone: the floating dock is the toolbar (kept outside the zoomed page). */}
      {(focus || (isPhone && zpct > 115 && !settings.zdockHidden) || (isPhone && overlay && tool !== 'pointer')) && dockPortal(<WriteDock settings={settings} update={onSettings} drawTool={drawTool} pos={settings.zdock} focus={focus} tool={tool} onTool={onTool}
        color={(settings[drawTool === 'highlighter' ? 'highlighter' : 'pen'] || {}).color} onColor={onColor} onExit={() => onFocus && onFocus(false)} onSave={(zdock) => onSettings && onSettings({ zdock })}
        onUndo={doUndo} onRedo={doRedo} eraserOn={tool === 'eraser'} onEraser={() => onDoubleTap && onDoubleTap()} onLine={() => nudge('line')} onRight={() => nudge('right')} onLeft={() => nudge('left')} zpct={zpct} onZoom={cycleZoom} order={settings.zdockOrder} hide={settings.zdockOff} />)}
      {onAddSheet && sp && sheets > 2 && (
        <div className="sheetnav" onPointerDown={(e) => e.stopPropagation()}>
          <button className="sq" aria-label="Previous pages" disabled={left === 0} onClick={() => setCurSheet(left - 2)}><Icon n="chevl" /></button>
          <span>{left + 1}{hasRight ? '–' + (left + 2) : ''} / {sheets}</span>
          <button className="sq" aria-label="Next pages" disabled={left + 2 >= sheets} onClick={() => setCurSheet(left + 2)}><Icon n="chevr" /></button>
        </div>
      )}
      {onAddSheet && paged && !sp && (
        <div className="sheetnav" onPointerDown={(e) => e.stopPropagation()}>
          {sheets > 1 && <button className="sq" aria-label="Previous page" disabled={cs === 0} onClick={() => setCurSheet(cs - 1)}><Icon n="chevl" /></button>}
          {sheets > 1 && <span>{cs + 1} / {sheets}</span>}
          {cs < sheets - 1
            ? <button className="sq" aria-label="Next page" onClick={() => setCurSheet(cs + 1)}><Icon n="chevr" /></button>
            : <button className="sq" aria-label="Add a page" title="Add a page" onClick={() => { onAddSheet(sheets + 1); setCurSheet(sheets); }}>+</button>}
        </div>
      )}
      {chips && chips.map((c) => (
        <button key={c.key} className={'cchip' + (c.text ? ' txt' : '')} aria-label={c.label} onPointerDown={(e) => e.stopPropagation()} onClick={c.onClick}
          style={{ left: (c.x / W) * 100 + '%', top: ((c.y - vy0) / vh) * 100 + '%', width: c.text ? undefined : (c.w / W) * 100 + '%', height: c.text ? undefined : (c.h / vh) * 100 + '%' }}>{c.text}</button>
      ))}
      {hdrPick && headerCtx && (
        <>
          <div className="sheet-bg" onClick={() => setHdrPick(false)} />
          <section className="sheet" aria-label="Use as header">
            <div className="grab" />
            <div className="ptitle hand">Use this as…</div>
            <p className="hint">It replaces the typed one everywhere: the calendar, the month cover and the week page. Undo puts your drawing back.</p>
            <div className="hdrpick">
              <button className="btn" onClick={() => act.header(`m-${headerCtx.y}-${headerCtx.m}`)}>{headerCtx.monthName} title</button>
              <button className="btn" onClick={() => act.header(`y-${headerCtx.y}`)}>{headerCtx.y}</button>
            </div>
            <div className="ptitle small" style={{ marginTop: 12 }}>A WEEKDAY (every week)</div>
            <div className="hdrpick">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => <button key={d} className="mini" onClick={() => act.header(`wd-${i}`)}>{d}</button>)}
            </div>
          </section>
        </>
      )}
      {sorter && (
        <>
          <div className="sheet-bg" onClick={() => setSorter(false)} />
          <section className="sheet sorter" aria-label="Pages on this tab">
            <div className="grab" />
            {pageSettings && (
              <div className="seg" style={{ marginBottom: 10 }}>
                <button className={sorterTab === 'pages' ? 'on' : ''} onClick={() => setSorterTab('pages')}>Pages</button>
                <button className={sorterTab === 'paper' ? 'on' : ''} onClick={() => setSorterTab('paper')}>Paper &amp; shape</button>
              </div>
            )}
            {sorterTab === 'paper' && pageSettings}
            {sorterTab === 'pages' && <>
            <div className="prow"><div className="ptitle hand">Pages</div><span className="hint" style={{ margin: 0 }}>Tap a page to go to it</span></div>
            <div className="sortgrid">
              {Array.from({ length: sheets }, (_, k) => (
                <div key={k} className={'sortcard' + (paged && k === cs ? ' on' : '')}>
                  <button className="sortthumb" onClick={() => goSheet(k)} aria-label={'Go to page ' + (k + 1)}>
                    <svg viewBox={`0 ${k * H} ${W} ${H}`}>
                      <rect y={k * H} width={W} height={H} fill={paperColor} />
                      {items.filter((it) => sheetOfI(it) === k).sort((a, b) => (a.z || 0) - (b.z || 0)).map((it) => <ItemView key={it.id} it={it} />)}
                      {strokes.filter((x) => x.tool !== 'mask' && sheetOfS(x) === k).map((x) => <path key={x.id} d={pathFor(x)} fill={x.color} opacity={x.opacity ?? 1} />)}
                    </svg>
                  </button>
                  <div className="sortbar">
                    <button className="ib" aria-label="Move earlier" disabled={k === 0} onClick={() => moveSheet(k, -1)}><Icon n="chevl" s={16} /></button>
                    <b>{k + 1}</b>
                    <button className="ib" aria-label="Move later" disabled={k === sheets - 1} onClick={() => moveSheet(k, 1)}><Icon n="chevr" s={16} /></button>
                    <button className="ib" aria-label={'Delete page ' + (k + 1)} disabled={sheets <= 1} onClick={() => deleteSheet(k)}><Icon n="trash" s={15} /></button>
                  </div>
                </div>
              ))}
              {onAddSheet && <button className="sortcard sortadd" onClick={() => { onAddSheet(sheets + 1); goSheet(sheets); }}>+ Add page</button>}
            </div>
            </>}
            <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setSorter(false)}>Done</button>
          </section>
        </>
      )}
      {onAddSheet && !paged && <button className="addsheet" onClick={() => onAddSheet(sheets + 1)}>+ Add page</button>}
      {progress && !progress.hidden && <Progress progress={progress} onChange={onProgress} pct={pct} />}

      {textEdit && isPhone && (
        <>
          <div className="sheet-bg" onPointerDown={() => setTextEdit(null)} />
          <section className="sheet typesheet" key={textEdit.id + textEdit.key} onPointerDown={(e) => e.stopPropagation()}>
            <div className="grab" />
            <div className="ptitle hand">{textEdit.label || (textEdit.key === 'add' ? 'New unit' : 'Type')}</div>
            <input id="typesheet-in" autoFocus defaultValue={textEdit.value} placeholder={textEdit.placeholder || 'type here'} enterKeyHint={textEdit.next || textEdit.chain ? 'next' : 'done'}
              onKeyDown={(e) => { if (e.key === 'Enter') { if (textEdit.chain) saveText(e.currentTarget.value, !!e.currentTarget.value.trim()); else nextText(e.currentTarget.value); } }} />
            <div className="prow" style={{ marginTop: 12 }}>
              <button className="mini" onClick={() => setTextEdit(null)}>Cancel</button>
              {textEdit.next && <button className="mini" style={{ marginLeft: 'auto' }} onClick={() => nextText(document.getElementById('typesheet-in').value)}>Next →</button>}
              <button className="btn primary" style={textEdit.next ? undefined : { marginLeft: 'auto' }} onClick={() => saveText(document.getElementById('typesheet-in').value)}>Done</button>
            </div>
          </section>
        </>
      )}
      {textEdit && !isPhone && (
        <input key={textEdit.id + textEdit.key + textEdit.top} className="goalin" autoFocus defaultValue={textEdit.value} placeholder={textEdit.key === 'add' ? 'unit name, then enter…' : 'type…'}
          style={{ left: textEdit.left + '%', top: textEdit.top + '%', width: textEdit.width + '%', height: textEdit.height + '%', fontSize: textEdit.font }}
          onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => { if (!e.currentTarget.dataset.done) saveText(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.currentTarget.dataset.done = '1'; if (textEdit.next) nextText(e.currentTarget.value); else saveText(e.currentTarget.value, !!e.currentTarget.value.trim()); }
            if (e.key === 'Escape') { e.currentTarget.dataset.done = '1'; setTextEdit(null); }
          }} />
      )}
      {goalEdit && (() => {
        const it = items.find((x) => x.id === goalEdit.id);
        return (
          <input className="goalin" autoFocus defaultValue={it?.data.goals[goalEdit.i] || ''} placeholder="type a goal"
            style={{ left: goalEdit.left + '%', top: goalEdit.top + '%', width: goalEdit.width + '%', height: goalEdit.height + '%', fontSize: goalEdit.font }}
            onPointerDown={(e) => e.stopPropagation()} onBlur={(e) => saveGoal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setGoalEdit(null); }} />
        );
      })()}
      {moodPick && (
        <>
          <div className="moodbg" onPointerDown={() => setMoodPick(null)} />
          <div className="moodpop" style={{ left: `min(calc(${moodPick.left}% - 20px), calc(100% - 290px))`, top: `calc(${moodPick.top}% + 20px)` }}>
            {Object.keys(MOODS).map((m) => (
              <button key={m} aria-label={m} title={m} onClick={() => {
                const it = items.find((x) => x.id === moodPick.id); setMoodPick(null); if (!it) return;
                const moods = { ...it.data.moods }; if (moods[moodPick.day] === m) delete moods[moodPick.day]; else moods[moodPick.day] = m;
                const after = { ...it, data: { ...it.data, moods } };
                putItems([after]); push(() => putItems([it]), () => putItems([after]));
              }}>
                <svg viewBox="-18 -18 36 36" width="40" height="40"><circle r="16" fill={MOODS[m].fill} stroke="#3d3121" strokeWidth="1.6" />
                  <circle cx="-5" cy="-3" r="1.7" fill="#3d3121" /><circle cx="5" cy="-3" r="1.7" fill="#3d3121" />
                  <path d={MOODS[m].face} stroke="#3d3121" strokeWidth="1.8" fill="none" strokeLinecap="round" /></svg>
                <small>{m}</small>
              </button>
            ))}
          </div>
        </>
      )}
      {wEdit && <WidgetEditor it={wEdit} onClose={() => setWEdit(null)} onSave={(after) => { const before = wEdit; putItems([after]); push(() => putItems([before]), () => putItems([after])); }}
        onDelete={() => { const before = wEdit; setWEdit(null); setSel({ s: [], i: [] }); removeItems([before.id]); push(() => putItems([before]), () => removeItems([before.id])); }} />}
      {editIt && editIt.kind === 'text' && (() => {
        const d = { ...editIt.data, ...(editing.data || {}) };
        const setD = (p) => setEditing({ ...editing, data: { ...(editing.data || {}), ...p } });
        const finish = () => {
          const text = editing.text.replace(/\s+$/, '');
          if (!text) { removeItems([editIt.id]); if (!editing.isNew) push(() => putItems([editIt]), () => removeItems([editIt.id])); setEditing(null); return; }
          // Size the box to the text: width from the longest line (up to the page edge), height from the line count.
          const fs = d.size || 28, cw = fs * 0.5;
          const maxW = Math.max(120, W - editIt.x - 20);
          const longest = Math.max(...text.split('\n').map((l) => l.length));
          const w = editing.isNew ? Math.min(maxW, Math.max(80, longest * cw + 16)) : editIt.w;
          const lines = text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil((l.length * cw) / Math.max(40, w - 8))), 0);
          const after = { ...editIt, w: r1(w), h: r1(lines * fs * 1.3 + 8), data: { ...d, text } };
          putItems([after]);
          if (editing.isNew) push(() => removeItems([after.id]), () => putItems([after])); else push(() => putItems([editIt]), () => putItems([after]));
          onSettings && onSettings({ textSize: d.size, textFont: d.font });
          setEditing(null);
        };
        return (
          <>
            <div className="sheet-bg" onClick={finish} />
            <section className="sheet textsheet" aria-label="Text box">
              <div className="grab" />
              <div className="prow">
                <div className="seg" style={{ width: 150 }}>
                  <button className={d.font !== 'clean' ? 'on' : ''} onClick={() => setD({ font: 'hand' })}>Handwritten</button>
                  <button className={d.font === 'clean' ? 'on' : ''} onClick={() => setD({ font: 'clean' })}>Clean</button>
                </div>
                <div className="seg" style={{ width: 132 }}>
                  {[20, 28, 40].map((z, i) => <button key={z} className={(d.size || 28) === z ? 'on' : ''} onClick={() => setD({ size: z })}>{['S', 'M', 'L'][i]}</button>)}
                </div>
                <button className={'mini' + (d.bold ? ' on' : '')} onClick={() => setD({ bold: !d.bold })} style={{ fontWeight: 800 }}>B</button>
              </div>
              <div className="swatches" style={{ marginTop: 8 }}>
                {palette.map((c) => <button key={c} className={'sw' + (d.color === c ? ' on' : '')} style={{ background: c }} aria-label={'Text color ' + c} onClick={() => setD({ color: c })} />)}
              </div>
              <textarea className="stickytext textedit" autoFocus value={editing.text} placeholder="Type your note…"
                style={{ fontFamily: d.font === 'clean' ? "'Nunito', system-ui, sans-serif" : "'Patrick Hand', cursive", color: d.color, fontWeight: d.bold ? 700 : 400 }}
                onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
              <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={finish}>Done</button>
            </section>
          </>
        );
      })()}
      {editIt && editIt.kind !== 'text' && (
        <>
          <div className="sheet-bg" />
          <section className="sheet" aria-label="Sticky note text">
            <div className="ptitle hand">Sticky note</div>
            <textarea className="stickytext" autoFocus value={editing.text} style={{ background: editIt.data?.color }}
              onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
            <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={() => {
              const before = editIt, after = { ...editIt, data: { ...editIt.data, text: editing.text } };
              putItems([after]); push(() => putItems([before]), () => putItems([after]));
              setEditing(null);
            }}>Done</button>
          </section>
        </>
      )}
    </div>
  );
});
export default Canvas;

function Progress({ progress, onChange, pct }) {
  const [pos, setPos] = useState(progress);
  const [sel, setSel] = useState(false);
  const drag = useRef(null);
  useEffect(() => { if (!drag.current) setPos(progress); }, [progress.x, progress.y]);

  const down = (e) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, moved: false };
  };
  const move = (e) => {
    if (!drag.current) return;
    const box = e.currentTarget.parentElement.getBoundingClientRect();
    if (Math.hypot(e.clientX - drag.current.sx, e.clientY - drag.current.sy) > 4) drag.current.moved = true;
    if (!drag.current.moved) return;
    setPos((p) => ({ ...p, x: Math.min(0.9, Math.max(0.1, (e.clientX - box.left) / box.width)), y: Math.min(0.98, Math.max(0.02, (e.clientY - box.top) / box.height)) }));
  };
  const up = () => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    if (d.moved) onChange(pos); else setSel((v) => !v);
  };

  return (
    <div className="prog" style={{ left: pos.x * 100 + '%', top: pos.y * 100 + '%' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      role="img" aria-label={`Week progress ${pct} percent`}>
      <div className="bar"><div style={{ width: pct + '%' }} /></div>
      <span className="pct">{pct}%</span>
      {sel && <button className="prog-x" aria-label="Hide progress bar" onPointerDown={(e) => e.stopPropagation()}
        onClick={() => { setSel(false); onChange({ ...pos, hidden: true }); }}>×</button>}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { stOf, matches, packItem } from './StickerLibrary';
import { sb } from './supabase';
import { useSettings } from './store';
import Charm, { BookCharm, CHARMS, mix } from './Charm';
import { ColorPicker, inkOn } from './Tools';
import Icon from './Icon';
import { Art, Decor, dragPct } from './CoverDecor';
import { FLUENT as PACKS } from './stickerPacks';
import { useStickers } from './items';
import Room from './Room';

export const COVER_COLORS = ['#4f8380', '#7a5c58', '#6e819c', '#8a9a6c', '#b98a5e', '#9d7aa8', '#c97d8a', '#3f4a5c', '#d4b48b', '#5b6e52'];
const PLATE_COLORS = ['#fbf4ea', '#ffffff', '#e8dcc6', '#d4b48b', '#f5d7dd', '#dbe7fa', '#dfe6d4', '#ece4f0', '#3d3121', '#1f1d1b'];
const plateOf = (b) => b.plate || mix(b.color, 0.72);
// Label styles for the cover (the spine follows along). 'none' hides the front label; the spine then shows just the name.
export const LABEL_STYLES = [['classic', 'Classic'], ['stitched', 'Stitched'], ['oval', 'Oval'], ['tag', 'Tag'], ['ribbon', 'Ribbon'], ['taped', 'Taped note'], ['none', 'No label']];
// Cover looks: a print/texture over the color, metal corners, an elastic band, ribbon color, stitched edge.
export const PATTERNS = [['', 'Plain'], ['linen', 'Linen'], ['leather', 'Leather'], ['dots', 'Dots'], ['grid', 'Grid'], ['stripes', 'Stripes'], ['gingham', 'Gingham'], ['stars', 'Stars'], ['floral', 'Floral'], ['hearts', 'Hearts'], ['waves', 'Waves']];
const CORNERS = [['', 'None'], ['#d9b45f', 'Gold'], ['#c9ccd2', 'Silver'], ['#e0a39a', 'Rose gold'], ['#6b4a35', 'Leather']];
const BANDS = ['', '#1f1d1b', '#fbf4ea', '#c95a55', '#d9b45f', '#7f9a74', '#9d7aa8', '#6e819c', '#e8a0b0'];
const RIBBONS = ['', '#c95a55', '#d9b45f', '#e8a0b0', '#7f9a74', '#6e819c', '#9d7aa8', '#fbf4ea', '#1f1d1b'];
const SHELF_COLORS = ['#8a6a4f', '#a07c5a', '#5e4636', '#c9b49a', '#6f8f62', '#4f8380', '#7a5c58', '#3a3633'];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function usePerRow() {
  const calc = () => (innerWidth < 600 ? 4 : innerWidth < 1000 ? 6 : 8);
  const [n, setN] = useState(calc);
  useEffect(() => { const f = () => setN(calc()); addEventListener('resize', f); return () => removeEventListener('resize', f); }, []);
  return n;
}

export function spineSize(b) { return [58 + (hash(b.id || 'new') % 18), 230 + (hash(b.name || '') % 60)]; }

// edit = { sel, onItem(e, d, surface), onPlate(e, surface) } turns on dragging inside the decorate screen.
function Spine({ b, selected, onClick, edit, onPointerDown, moving }) {
  const [w, h] = spineSize(b);
  const ink = inkOn(plateOf(b)), dec = b.decor || {};
  const Tag = edit ? 'div' : 'button';
  return (
    <Tag className={'spine' + (selected ? ' up' : '') + (dec.stitch ? ' stitch' : '') + (moving ? ' moving' : '')} data-book={b.id} style={{ height: h, width: w, '--c': b.color, ...(moving ? { transform: `translate(${moving.dx}px, ${moving.dy}px) rotate(-4deg)` } : {}) }} onClick={onClick} onPointerDown={onPointerDown} aria-label={edit ? undefined : 'Open ' + b.name}>
      {dec.pattern && <span className={'cpat p-' + dec.pattern} />}
      <span className="sband" />
      <span className={'splate ps-' + (dec.pstyle || 'classic') + (edit ? ' drag' : '')} style={{ background: dec.pstyle === 'none' ? 'transparent' : plateOf(b), color: dec.pstyle === 'none' ? inkOn(b.color) : ink, top: (dec.splateY || 0) + '%' }}
        onPointerDown={edit ? (e) => edit.onPlate(e, e.currentTarget.parentElement) : undefined}><span>{b.name || 'Untitled'}</span></span>
      <span className="sband low" />
      <Decor items={dec.spine} sel={edit?.sel} onDown={edit && ((e, d) => edit.onItem(e, d, e.currentTarget.parentElement))} />
      {b.charm && <BookCharm type={b.charm} color={b.color} size={0.62} at={w - 5} />}
    </Tag>
  );
}

export function Cover({ b, big, edit }) {
  const dec = b.decor || {}, pl = dec.plate;
  return (
    <div className={'cover' + (big ? ' big' : '') + (dec.stitch ? ' stitch' : '')} style={{ '--c': b.color, ...(dec.ribbon ? { '--rb': dec.ribbon } : {}) }}>
      {dec.pattern && <span className={'cpat p-' + dec.pattern} />}
      <span className="cspine" />
      <span className="cyear">{b.label || new Date().getFullYear()}</span>
      {dec.pstyle !== 'none' && <span className={'cplate ps-' + (dec.pstyle || 'classic') + (edit ? ' drag' : '')} style={{ background: plateOf(b), color: inkOn(plateOf(b)), ...(pl ? { left: pl.x + '%', top: pl.y + '%', bottom: 'auto', transform: 'translate(-50%,-50%)' } : {}) }}
        onPointerDown={edit ? (e) => edit.onPlate(e, e.currentTarget.parentElement) : undefined}>{b.name || 'Untitled'}</span>}
      <span className="ribbons"><i /><i /></span>
      {dec.corners && <><span className="ccorner tr" style={{ '--k': dec.corners }} /><span className="ccorner br" style={{ '--k': dec.corners }} /></>}
      <Decor items={dec.front} sel={edit?.sel} onDown={edit && ((e, d) => edit.onItem(e, d, e.currentTarget.parentElement))} />
      {dec.band && <span className="cband" style={{ '--bd': dec.band }} />}
      {b.charm && <BookCharm type={b.charm} color={b.color} at={big ? 7 : 5} size={big ? 1 : 0.55} />}
    </div>
  );
}

// Decorate screen: drag the label, add stickers to the front or spine, move/resize/turn them.
export function Decorate({ user, b, onDone, onClose, catOrder }) {
  const [dec, setDec] = useState(() => ({ front: [], spine: [], ...(b.decor || {}) }));
  const [side, setSide] = useState('front');
  const [sel, setSel] = useState(null);
  const [pick, setPick] = useState(false);
  const [pack, setPack] = useState('all');
  const [q, setQ] = useState('');
  const [stickers] = useStickers(user);
  const list = dec[side] || [];
  const cur = list.find((d) => d.id === sel);
  const setList = (fn) => setDec((d) => ({ ...d, [side]: fn(d[side] || []) }));
  const patch = (id, p) => setList((l) => l.map((d) => (d.id === id ? { ...d, ...p } : d)));
  const clamp = (v, a, z) => Math.max(a, Math.min(z, v));
  const edit = {
    sel,
    onItem: (e, d, surf) => { setSel(d.id); dragPct(e, surf, (dx, dy) => patch(d.id, { x: clamp(d.x + dx, 0, 100), y: clamp(d.y + dy, 0, 100) })); },
    onPlate: (e, surf) => {
      setSel(null);
      if (side === 'front') { const p0 = dec.plate || { x: 50, y: 76 }; dragPct(e, surf, (dx, dy) => setDec((d) => ({ ...d, plate: { x: clamp(p0.x + dx, 15, 85), y: clamp(p0.y + dy, 8, 92) } }))); }
      else { const y0 = dec.splateY || 0; dragPct(e, surf, (dx, dy) => setDec((d) => ({ ...d, splateY: clamp(y0 + dy, -30, 30) }))); }
    },
  };
  const [word, setWord] = useState('');
  const textA = (t) => 34 / Math.max(40, t.length * 15 + 16);
  const add = (st, a = 1, s0) => {
    const d = { id: crypto.randomUUID(), st, a, x: 50, y: side === 'front' ? 40 : 30, s: s0 || (side === 'front' ? 26 : 80), r: 0 };
    setList((l) => [...l, d]); setSel(d.id); setPick(false);
  };
  const preview = { ...b, decor: dec };
  const mine = stickers;
  // Sticker picker: All, the built-in packs, then your own folders (in your order). Search looks inside the folder you're in.
  const order = catOrder || [];
  const myCats = [...new Set(mine.map((s) => s.category || 'My stickers'))].sort((a, c) => (order.indexOf(a) + 1 || 999) - (order.indexOf(c) + 1 || 999));
  const packPool = (p) => p.items.map((k) => packItem(k, p.name));
  const pool = pack === 'all' ? [...mine, ...PACKS.flatMap(packPool)] : pack.startsWith('my:') ? mine.filter((s) => (s.category || 'My stickers') === pack.slice(3)) : packPool(PACKS.find((p) => p.name === pack) || PACKS[0]);
  const found = q.trim() ? pool.filter((s) => matches(s, q)) : pool;
  const LIMIT = 240, shown = found.slice(0, LIMIT);
  return (
    <>
      <div className="sheet-bg" />
      <section className="sheet decorate" aria-label="Decorate cover">
        <div className="prow"><div className="ptitle hand">Decorate</div>
          <div className="seg" style={{ width: 170 }}>
            <button className={side === 'front' ? 'on' : ''} onClick={() => { setSide('front'); setSel(null); }}>Front</button>
            <button className={side === 'spine' ? 'on' : ''} onClick={() => { setSide('spine'); setSel(null); }}>Spine</button>
          </div>
        </div>
        <div className="declayout"><div className="decleft">
        <p className="hint">Drag the label or a sticker to move it. Tap a sticker for size, turn and delete.</p>
        <div className="decstage" onPointerDown={(e) => { if (e.target === e.currentTarget) setSel(null); }}>
          {side === 'front'
            ? <div className="decfront"><Cover b={preview} big edit={edit} /></div>
            : <div className="decspine"><Spine b={preview} edit={edit} /></div>}
        </div>
        </div><div className="decright">
        {cur ? (
          <div className="prow decctl">
            <button className="mini" onClick={() => patch(cur.id, { s: Math.max(6, cur.s / 1.15) })}>Smaller</button>
            <button className="mini" onClick={() => patch(cur.id, { s: Math.min(side === 'front' ? 90 : 140, cur.s * 1.15) })}>Bigger</button>
            <button className="mini" onClick={() => patch(cur.id, { r: (cur.r || 0) - 15 })} aria-label="Turn left">⟲</button>
            <button className="mini" onClick={() => patch(cur.id, { r: (cur.r || 0) + 15 })} aria-label="Turn right">⟳</button>
            <button className="mini" onClick={() => setList((l) => [...l.filter((d) => d.id !== cur.id), cur])}>To front</button>
            {(cur.st.src === 'text' || cur.st.src === 'washi') && <span className="decinks">{DECO_INKS.map((c) => <button key={c} className={'sw' + (cur.st.color === c ? ' on' : '')} style={{ background: c }} aria-label={'Color ' + c} onClick={() => patch(cur.id, { st: { ...cur.st, color: c } })} />)}</span>}
            {cur.st.src === 'text' && <input className="dectext" value={cur.st.text} onChange={(e) => { const t = e.target.value; patch(cur.id, { st: { ...cur.st, text: t }, a: textA(t) }); }} aria-label="Text" />}
            {cur.st.src === 'text' && <button className="mini" onClick={() => patch(cur.id, { st: { ...cur.st, font: FONTS[(FONTS.indexOf(cur.st.font) + 1) % FONTS.length] } })}>Font</button>}
            {cur.st.src === 'washi' && <button className="mini" onClick={() => patch(cur.id, { st: { ...cur.st, p: WASHI[(WASHI.indexOf(cur.st.p) + 1) % WASHI.length] } })}>Pattern</button>}
            <button className="mini danger" onClick={() => { setList((l) => l.filter((d) => d.id !== cur.id)); setSel(null); }}><Icon n="trash" s={14} /></button>
          </div>
        ) : (
          <div className="prow decctl">
            <button className="btn" onClick={() => setPick((v) => !v)}>{pick ? 'Hide stickers' : '+ Sticker'}</button>
            <button className="btn" onClick={() => add({ src: 'washi', color: '#e8a0b0', p: 'dots' }, 0.2, side === 'front' ? 55 : 120)}>+ Washi tape</button>
            <form className="decword" onSubmit={(e) => { e.preventDefault(); const t = word.trim(); if (!t) return; add({ src: 'text', text: t, color: '#fbf4ea', font: FONTS[0] }, textA(t), side === 'front' ? Math.min(80, 12 + t.length * 5) : 90); setWord(''); }}>
              <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Add words…" aria-label="Words for the cover" /><button className="btn" disabled={!word.trim()}>+</button>
            </form>
          </div>
        )}
        {pick && (
          <div className="decpick">
            <input className="decsearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder={pack === 'all' ? 'Search all stickers (name, color, style…)' : 'Search this folder…'} aria-label="Search stickers" />
            <div className="catrow wrap">
              <button className={'catchip' + (pack === 'all' ? ' on' : '')} onClick={() => setPack('all')}>All</button>
              {myCats.map((c) => <button key={'my:' + c} className={'catchip mine' + (pack === 'my:' + c ? ' on' : '')} onClick={() => setPack('my:' + c)}>{c}</button>)}
              {PACKS.map((p) => <button key={p.name} className={'catchip' + (pack === p.name ? ' on' : '')} onClick={() => setPack(p.name)}>{p.name}</button>)}
            </div>
            <div className="stgrid">
              {shown.map((s, i) => {
                const st = stOf(s);
                return <button key={s.id + ':' + i} className="sttile" onClick={() => add(st, s.pack ? 1 : (s.h || 1) / (s.w || 1))} aria-label={s.name || s.data?.name || 'Sticker'} title={s.name || s.data?.name || ''}><Art st={st} /></button>;
              })}
            </div>
            {!found.length && <p className="hint">No stickers match “{q}”{pack !== 'all' ? ' in this folder — try All' : ''}.</p>}
            {found.length > LIMIT && <p className="hint">Showing {LIMIT} of {found.length} — search to narrow it down.</p>}
          </div>
        )}
        <div className="lbl" style={{ marginTop: 14 }}>LABEL</div>
        <div className="catrow wrap">{LABEL_STYLES.map(([v, l]) => <button key={v} className={'catchip' + ((dec.pstyle || 'classic') === v ? ' on' : '')} onClick={() => setDec((d) => ({ ...d, pstyle: v === 'classic' ? undefined : v }))}>{l}</button>)}</div>
        <div className="prow" style={{ marginTop: 10 }}>
          <button className="mini" onClick={() => { setDec((d) => ({ ...d, plate: undefined, splateY: 0 })); }}>Reset label spot</button>
          <span style={{ flex: 1 }} />
          <button className="mini" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => { onDone(dec); onClose(); }}>Done</button>
        </div>
        </div></div>
      </section>
    </>
  );
}

const DECO_INKS = ['#fbf4ea', '#1f1d1b', '#d9b45f', '#c95a55', '#e8a0b0', '#f3d98a', '#a9c79a', '#9ec5d8', '#c8b2e6', '#b98a5e'];
const FONTS = ['Dancing Script', 'Patrick Hand', 'Caveat', 'serif'];
const WASHI = ['dots', 'stripes', 'grid', 'plain', 'hearts'];

function Opt({ on, onClick, children, label, style }) {
  return <button className={'copt' + (on ? ' on' : '')} onClick={onClick} aria-label={label} title={label} style={style}>{children}</button>;
}

function BookForm({ user, initial, onSave, onDelete, onClose, catOrder }) {
  const [b, setB] = useState(initial);
  const [deco, setDeco] = useState(false);
  if (deco) return <Decorate user={user} b={b} catOrder={catOrder} onDone={(decor) => setB({ ...b, decor })} onClose={() => setDeco(false)} />;
  const isNew = !initial.id;
  const d = b.decor || {};
  const setD = (p) => setB({ ...b, decor: { ...d, ...p } });
  return (
    <>
      <div className="sheet-bg" />
      <section className="sheet bookform" aria-label={isNew ? 'New notebook' : 'Edit notebook'}>
        <div className="ptitle hand">{isNew ? 'New notebook' : 'Edit notebook'}</div>
        <div className="bookform-grid">
          <div className="bookprev"><Cover b={b} /><button className="mini" style={{ marginTop: 10, width: '100%' }} onClick={() => setDeco(true)}>Decorate</button></div>
          <div>
            <label className="field">Name<input value={b.name} autoFocus onChange={(e) => setB({ ...b, name: e.target.value })} placeholder="Planner 2027" /></label>
            <label className="field">Small label (optional)<input value={b.label || ''} onChange={(e) => setB({ ...b, label: e.target.value })} placeholder="2027" /></label>
            <div className="ptitle small" style={{ marginTop: 12 }}>TYPE</div>
            <div className="seg">
              <button className={b.kind === 'planner' ? 'on' : ''} onClick={() => setB({ ...b, kind: 'planner' })}>Planner · weeks</button>
              <button className={b.kind === 'notebook' ? 'on' : ''} onClick={() => setB({ ...b, kind: 'notebook' })}>Notebook · pages</button>
            </div>
          </div>
        </div>
        <div className="ptitle small" style={{ marginTop: 14 }}>CHARM</div>
        <div className="charms">
          <button className={'charmpick' + (!b.charm ? ' on' : '')} onClick={() => setB({ ...b, charm: null })}>None</button>
          {CHARMS.map(([id, l]) => (
            <button key={id} className={'charmpick' + (b.charm === id ? ' on' : '')} onClick={() => setB({ ...b, charm: id })} aria-label={l}>
              <Charm type={id} color={b.color} size={0.5} style={{ animation: 'none' }} /><small>{l}</small>
            </button>
          ))}
        </div>
        <div className="ptitle small" style={{ marginTop: 14 }}>COVER COLOR</div>
        <div className="swatches" style={{ marginTop: 8 }}>
          {COVER_COLORS.map((c) => <button key={c} className={'sw' + (b.color === c ? ' on' : '')} style={{ background: c }} aria-label={'Cover ' + c} onClick={() => setB({ ...b, color: c })} />)}
        </div>
        <ColorPicker value={b.color} onChange={(c) => setB({ ...b, color: c })} />
        <div className="ptitle small" style={{ marginTop: 14 }}>LABEL COLOR</div>
        <div className="swatches" style={{ marginTop: 8 }}>
          <button className={'sw auto' + (!b.plate ? ' on' : '')} style={{ background: mix(b.color, 0.72) }} aria-label="Label matches cover" title="Match cover" onClick={() => setB({ ...b, plate: null })}>Auto</button>
          {PLATE_COLORS.map((c) => <button key={c} className={'sw' + (b.plate === c ? ' on' : '')} style={{ background: c }} aria-label={'Label ' + c} onClick={() => setB({ ...b, plate: c })} />)}
          <label className="sw custom" title="Custom label color"><input type="color" value={b.plate || mix(b.color, 0.72)} onChange={(e) => setB({ ...b, plate: e.target.value })} aria-label="Custom label color" /></label>
        </div>
        <div className="ptitle small" style={{ marginTop: 14 }}>COVER PRINT</div>
        <div className="copts">
          {PATTERNS.map(([id, l]) => <Opt key={id} on={(d.pattern || '') === id} label={l} onClick={() => setD({ pattern: id || undefined })}><span className="coptsw" style={{ '--c': b.color }}>{id && <span className={'cpat p-' + id} />}</span><small>{l}</small></Opt>)}
        </div>
        <div className="ptitle small" style={{ marginTop: 14 }}>CORNERS</div>
        <div className="copts">
          {CORNERS.map(([c, l]) => <Opt key={l} on={(d.corners || '') === c} label={l} onClick={() => setD({ corners: c || undefined })}><span className="coptsw" style={{ '--c': b.color }}>{c && <span className="ccorner tr" style={{ '--k': c }} />}</span><small>{l}</small></Opt>)}
        </div>
        <div className="ptitle small" style={{ marginTop: 14 }}>ELASTIC BAND</div>
        <div className="swatches" style={{ marginTop: 8 }}>
          {BANDS.map((c) => <button key={c || 'none'} className={'sw' + (c ? '' : ' auto') + ((d.band || '') === c ? ' on' : '')} style={{ background: c || 'transparent' }} aria-label={c ? 'Band ' + c : 'No band'} onClick={() => setD({ band: c || undefined })}>{c ? '' : 'None'}</button>)}
        </div>
        <div className="ptitle small" style={{ marginTop: 14 }}>RIBBON BOOKMARKS</div>
        <div className="swatches" style={{ marginTop: 8 }}>
          {RIBBONS.map((c) => <button key={c || 'auto'} className={'sw' + (c ? '' : ' auto') + ((d.ribbon || '') === c ? ' on' : '')} style={{ background: c || `color-mix(in srgb, ${b.color} 70%, #000)` }} aria-label={c ? 'Ribbon ' + c : 'Ribbon matches cover'} onClick={() => setD({ ribbon: c || undefined })}>{c ? '' : 'Auto'}</button>)}
        </div>
        <label className="toggle" style={{ marginTop: 12 }}><input type="checkbox" checked={!!d.stitch} onChange={(e) => setD({ stitch: e.target.checked || undefined })} /><span>Stitched edge</span></label>
        <div className="prow" style={{ marginTop: 16 }}>
          {!isNew ? <button className="mini danger" onClick={() => { if (confirm(`Delete "${initial.name}" and everything in it? This can't be undone.`)) { onDelete(); onClose(); } }}><Icon n="trash" s={14} /> Delete notebook</button> : <button className="mini" onClick={onClose}>Cancel</button>}
          <button className="btn primary" disabled={!b.name.trim()} onClick={() => { onSave({ ...b, name: b.name.trim() }); onClose(); }}>{isNew ? 'Create' : 'Save'}</button>
        </div>
      </section>
    </>
  );
}

export default function Shelf({ user, books, api, onOpen }) {
  const [settings, update] = useSettings(user);
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(null);
  const [shelfPick, setShelfPick] = useState(false);
  const [opening, setOpening] = useState(false);
  // Arrange: drag a book onto another to put it in front of that one (or onto the + to send it to the end).
  const [arrange, setArrange] = useState(false);
  const [mv, setMv] = useState(null);
  const [hot, setHot] = useState(null);
  const startMove = (e, b) => {
    if (!arrange) return;
    e.preventDefault();
    const x0 = e.clientX, y0 = e.clientY, z = e.currentTarget.getBoundingClientRect().width / e.currentTarget.offsetWidth || 1;
    let target = null;
    const move = (ev) => {
      setMv({ id: b.id, dx: (ev.clientX - x0) / z, dy: (ev.clientY - y0) / z });
      const el = document.elementsFromPoint(ev.clientX, ev.clientY).find((x) => (x.dataset?.book && x.dataset.book !== b.id) || x.classList?.contains('addspine'));
      target = el ? el.dataset.book || 'end' : null; setHot(target);
    };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); setMv(null); setHot(null);
      if (!target) return;
      const rest = books.filter((x) => x.id !== b.id);
      const i = target === 'end' ? rest.length : rest.findIndex((x) => x.id === target);
      const lo = i > 0 ? rest[i - 1].position : (rest[0]?.position ?? Date.now()) - 1000, hi = i < rest.length ? rest[i].position : lo + 2000;
      api.update(b.id, { position: (lo + hi) / 2 });
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };
  const openBook = (id) => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return onOpen(id);
    setOpening(true); setTimeout(() => { setOpening(false); onOpen(id); }, 650);
  };
  const perScreen = usePerRow();
  const per = settings.room?.theme ? 6 : perScreen; // in a themed room the bookcase is the same on every screen
  const shelf = settings.shelfColor || '#8a6a4f';
  const tiles = [...books.map((b) => ({ b })), { add: true }];
  const rows = [];
  for (let i = 0; i < tiles.length; i += per) rows.push(tiles.slice(i, i + per));
  if (rows.length < 2) rows.push([]);
  const chosen = books.find((b) => b.id === sel);

  return (
    <div className="shelfroom">
      <Room settings={settings} update={update} deps={[books.length, per]} header={({ onDecorate, editing }) => (
        <>
          <header className="shelfhdr">
            <h1 className="hand">My shelf</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {!editing && <button className={'mini' + (arrange ? ' on' : '')} onClick={() => setArrange((v) => !v)}>{arrange ? '✓ Done arranging' : '⇄ Arrange books'}</button>}
              {!editing && !arrange && <button className="mini" onClick={onDecorate}>✿ Decorate room</button>}
              <button className="mini" onClick={() => sb.auth.signOut()}><Icon n="logout" s={14} /> Sign out</button>
            </div>
          </header>
          {shelfPick && (
            <div className="shelfpick">
              {SHELF_COLORS.map((c) => <button key={c} className={'sw' + (shelf === c ? ' on' : '')} style={{ background: c }} aria-label={'Shelf ' + c} onClick={() => update({ shelfColor: c })} />)}
              <label className="sw custom" title="Custom shelf color"><input type="color" value={shelf} onChange={(e) => update({ shelfColor: e.target.value })} aria-label="Custom shelf color" /></label>
            </div>
          )}
        </>
      )}>
      <div className={'shelves' + (arrange ? ' arranging' : '')}>
        {rows.map((row, ri) => (
          <div key={ri} className="shelfrow">
            <div className="books">
              {row.map((t, i) => t.add
                ? <button key="add" className="spine addspine" onClick={() => setForm({ name: '', kind: 'planner', color: COVER_COLORS[books.length % COVER_COLORS.length], charm: null, label: '', plate: null })} aria-label="New notebook">+</button>
                : <Spine key={t.b.id} b={t.b} selected={sel === t.b.id || hot === t.b.id} moving={mv?.id === t.b.id ? mv : null} onPointerDown={(e) => startMove(e, t.b)} onClick={() => !arrange && setSel(t.b.id)} />)}
            </div>
            <div className="plank" style={{ '--s': shelf }} />
          </div>
        ))}
      </div>
      </Room>

      {chosen && !form && (
        <>
          <div className="sheet-bg" onClick={() => setSel(null)} />
          <div className={'bookpop' + (opening ? ' opening' : '')} role="dialog" aria-label={chosen.name}>
            <button className="coverbtn" onClick={() => openBook(chosen.id)} aria-label={'Open ' + chosen.name}><span className="bpages" style={{ '--c': chosen.color }} /><Cover b={chosen} big /></button>
            <div className="prow" style={{ justifyContent: 'center', gap: 10 }}>
              <button className="btn" onClick={() => setForm(chosen)}>Edit</button>
              <button className="btn primary" onClick={() => openBook(chosen.id)}>Open</button>
            </div>
          </div>
        </>
      )}
      {form && (
        <BookForm user={user} initial={form} catOrder={settings.stickerCatOrder} onClose={() => setForm(null)}
          onSave={(b) => { if (b.id) api.update(b.id, { name: b.name, kind: b.kind, color: b.color, charm: b.charm, label: b.label || null, plate: b.plate || null, decor: b.decor || {} }); else setSel(api.add(b)); }}
          onDelete={() => { api.remove(form.id); setSel(null); }} />
      )}
    </div>
  );
}

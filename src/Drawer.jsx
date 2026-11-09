import { useEffect, useRef, useState } from 'react';
import { BUILTIN } from './stickerArt';
import { FLUENT, stickerUrl } from './stickerPacks';
import StickerLibrary, { useImporter, filesFrom, hasFiles, stOf, packItem, matches } from './StickerLibrary';
import { SHAPES, WASHI, WASHI_COLORS, STICKY_COLORS, WashiPattern } from './Items';
import { WIDGETS, WidgetView } from './Widgets';
import { pathFor, inkOrder } from './geom';
import { uploadImage } from './items';
import Icon from './Icon';

const fit = (w, h, max) => { const k = Math.min(1, max / Math.max(w, h)); return [Math.round(w * k), Math.round(h * k)]; };

export function Thumb({ st }) {
  if (st.src === 'pack') return <img src={stickerUrl(st.key)} className="thumb" alt="" loading="lazy" />;
  if (st.src === 'builtin') return <svg viewBox="0 0 100 100" className="thumb" dangerouslySetInnerHTML={{ __html: BUILTIN[st.key] }} />;
  if (st.src === 'image') return <img src={st.url} className="thumb" alt="" loading="lazy" decoding="async" />;
  const pad = 6;
  return (
    <svg viewBox={`${-pad} ${-pad} ${st.w0 + pad * 2} ${st.h0 + pad * 2}`} className="thumb">
      {inkOrder(st.strokes).map((s, i) => <path key={i} d={pathFor(s)} fill={s.color} opacity={s.opacity ?? 1} />)}
    </svg>
  );
}

export default function Drawer({ user, stickers, stickerApi, settings, update, penColor, onPlace, onWashi, onClose, progress }) {
  const [tab, setTab] = useState('stickers');
  const order = settings.stickerCatOrder || [];
  // Your categories (kept even when empty so a new one can be filled), then the built-in packs you haven't hidden.
  const mineCats = [...new Set([...order, ...stickers.map((s) => s.category)])];
  const hidden = settings.hiddenPacks || [];
  const cats = [...mineCats, ...FLUENT.map((p) => p.name).filter((n) => !hidden.includes(n))];
  const favs = settings.stickerFavs || [], recent = settings.recentStickers || [];
  const [cat, setCat] = useState(recent.length ? 'Recent' : 'All');
  const [lib, setLib] = useState(false);
  const [dropHi, setDropHi] = useState(false);
  const [busy, setBusy] = useState('');
  const [washi, setWashi] = useState({ pattern: 'stripes', c1: WASHI_COLORS[0][0], c2: WASHI_COLORS[0][1], width: 46 });
  const file = useRef();
  const photo = useRef();
  const isMine = mineCats.includes(cat);
  const pack = FLUENT.find((p) => p.name === cat);
  const all = [...stickers, ...FLUENT.flatMap((p) => p.items.map((k) => packItem(k, p.name)))];
  const byId = Object.fromEntries(all.map((x) => [x.id, x]));
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  // Search looks inside whatever you have open; pick All to search everything.
  const inView = cat === 'All' ? all
    : cat === 'Favorites' ? favs.map((id) => byId[id]).filter(Boolean)
    : cat === 'Recent' ? recent.map((id) => byId[id]).filter(Boolean)
      : [...(pack ? pack.items.map((k) => packItem(k, pack.name)) : []), ...stickers.filter((x) => x.category === cat).sort((a, b) => a.position - b.position)];
  const shownAll = ql ? inView.filter((x) => matches(x, ql)) : inView;
  const [lim, setLim] = useState(120);
  useEffect(() => { setLim(120); }, [cat, ql]);
  const shown = shownAll.slice(0, lim);
  const imp = useImporter({ user, stickerApi, mineCats, update });

  // Put a sticker on the page and remember it under Recent.
  const use = (s) => {
    update((st) => ({ recentStickers: [s.id, ...(st.recentStickers || []).filter((x) => x !== s.id)].slice(0, 24) }));
    const v = stOf(s);
    if (v.src === 'pack') return onPlace('sticker', v, 160, 160);
    if (v.src === 'image') { const [w, h] = fit(s.w, s.h, 320); return onPlace('sticker', v, w, h); }
    const [w, h] = fit(s.w, s.h, 360); onPlace('sticker', v, w, h);
  };
  const importTo = async (files) => { const c = await imp.run(files, isMine || pack ? cat : null); if (c[0]) setCat(c[0]); };

  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      {lib && <StickerLibrary user={user} stickers={stickers} stickerApi={stickerApi} settings={settings} update={update} start={cat} onUse={(s) => { setLib(false); use(s); }} onClose={() => setLib(false)} />}
      <section className={'sheet drawer-sheet' + (dropHi ? ' drop' : '')} aria-label="Stickers and decorations"
        onDragOver={(e) => { if (tab === 'stickers' && hasFiles(e)) { e.preventDefault(); e.stopPropagation(); setDropHi(true); } }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDropHi(false); }}
        onDrop={async (e) => { if (tab !== 'stickers' || !hasFiles(e)) return; e.preventDefault(); e.stopPropagation(); setDropHi(false); importTo(await filesFrom(e.dataTransfer)); }}>
        <div className="grab" />
        <div className="seg" role="tablist">
          {[['stickers', 'Stickers'], ['trackers', 'Trackers'], ['photos', 'Photos'], ['washi', 'Washi'], ['sticky', 'Notes'], ['shapes', 'Shapes']].map(([id, l]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>{l}</button>
          ))}
        </div>

        {tab === 'stickers' && (
          <>
            <label className="libsearch drsearch"><Icon n="search" s={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={cat === 'All' ? 'Search all stickers' : `Search ${cat}`} aria-label="Search stickers" />{q && <button className="impx" onClick={() => setQ('')} aria-label="Clear search">×</button>}</label>
            <div className="catbar">
            <button className="catnav" aria-label="Scroll categories left" onClick={(e) => e.currentTarget.nextSibling.scrollBy({ left: -260, behavior: 'smooth' })}>‹</button>
            <div className="catrow one" onWheel={(e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY; }}>
              <button className={'catchip' + (cat === 'All' ? ' on' : '')} onClick={() => setCat('All')}>All</button>
              {recent.length > 0 && <button className={'catchip' + (cat === 'Recent' ? ' on' : '')} onClick={() => setCat('Recent')}>🕘 Recent</button>}
              {favs.length > 0 && <button className={'catchip' + (cat === 'Favorites' ? ' on' : '')} onClick={() => setCat('Favorites')}>★ Favorites</button>}
              {mineCats.length > 0 && <span className="catgrp">yours</span>}
              {mineCats.map((c) => <button key={c} className={'catchip' + (c === cat ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
              <span className="catgrp">packs</span>
              {cats.filter((c) => !mineCats.includes(c)).map((c) => <button key={c} className={'catchip' + (c === cat ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>)}
            </div>
            <button className="catnav" aria-label="Scroll categories right" onClick={(e) => e.currentTarget.previousSibling.scrollBy({ left: 260, behavior: 'smooth' })}>›</button>
            </div>
            <div className="prow">
              <span className="ptitle hand">{cat === 'All' ? 'All stickers' : cat}{ql && <small className="drcount"> · {shownAll.length} match{shownAll.length === 1 ? '' : 'es'}</small>}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="mini" onClick={() => file.current.click()}><Icon n="up" s={14} /> Import</button>
                <button className="mini" onClick={() => setLib(true)}><Icon n="books" s={14} /> Library</button>
              </div>
              <input ref={file} type="file" accept="image/*,.zip,application/zip" multiple hidden onChange={(e) => { importTo([...e.target.files]); e.target.value = ''; }} />
            </div>
            {imp.busy && <p className="hint">{imp.busy}</p>}
            {imp.askEl}
            <div className="stgrid">
              {shown.map((s) => (
                <button key={s.id} className="sttile" onClick={() => use(s)} aria-label={s.name || s.data?.name || 'Sticker'} title={s.name || s.data?.name || ''}>
                  <Thumb st={stOf(s)} />
                </button>
              ))}
            </div>
            {shownAll.length > lim && <button className="mini" style={{ width: '100%', marginTop: 10 }} ref={(el) => { if (!el) return; const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); setLim((n) => n + 150); } }); io.observe(el); }} onClick={() => setLim((n) => n + 150)}>Show more ({shownAll.length - lim} left)</button>}
            {!shown.length && <p className="hint">{isMine ? 'Empty folder — drop images here or tap Import.' : 'Nothing here yet.'}</p>}
            {dropHi && <div className="libdrop">Drop to add to {isMine || pack ? `“${cat}”` : 'your stickers'}</div>}
            {!mineCats.length && <p className="hint">Make your own: lasso something you drew → “Save as sticker”. Or drag PNGs, sticker sheets or a .zip right onto this panel.</p>}
          </>
        )}

        {tab === 'trackers' && (
          <>
            <p className="hint">Tap a tracker to add it. Tap inside it to fill it in. Select it with the lasso and tap Edit to change its habits, categories, or size.</p>
            <div className="trgrid">
              {Object.entries(WIDGETS).filter(([, W]) => !W.hidden).map(([k, W]) => {
                const d = W.init(); const [w, h] = W.size(d);
                return (
                  <button key={k} className="trtile" onClick={() => onPlace('widget', d, w, h)}>
                    <span className="trprev"><WidgetView data={d} w="100%" h="100%" /></span>
                    <small>{W.label}</small>
                  </button>
                );
              })}
              {progress}
            </div>
          </>
        )}

        {tab === 'photos' && (
          <>
            <p className="hint">Add a photo straight onto the page. Move, resize, and rotate it with the lasso.</p>
            <button className="btn primary" style={{ width: '100%', marginTop: 10 }} onClick={() => photo.current.click()} disabled={!!busy}>{busy || 'Choose a photo'}</button>
            <input ref={photo} type="file" accept="image/*" hidden onChange={async (e) => {
              const f = e.target.files[0]; e.target.value = '';
              if (!f) return;
              setBusy('Adding photo…');
              try { const { url, w, h } = await uploadImage(user, f); const [pw, ph] = fit(w, h, 420); onPlace('sticker', { src: 'image', url, photo: true }, pw, ph); }
              catch (err) { alert('Could not add the photo: ' + (err.message || err)); }
              setBusy('');
            }} />
          </>
        )}

        {tab === 'washi' && (
          <>
            <p className="hint">Pick a tape, then drag across the page to lay it down.</p>
            <div className="ptitle small" style={{ marginTop: 10 }}>PATTERN</div>
            <div className="washigrid">
              {WASHI.map((p) => (
                <button key={p} className={'washi' + (washi.pattern === p ? ' on' : '')} onClick={() => setWashi({ ...washi, pattern: p })} aria-label={p}>
                  <svg viewBox="0 0 120 34" width="100%" height="34"><defs><WashiPattern id={'wd-' + p} kind={p} c1={washi.c1} c2={washi.c2} /></defs><rect width="120" height="34" fill={`url(#wd-${p})`} /></svg>
                </button>
              ))}
            </div>
            <div className="ptitle small" style={{ marginTop: 10 }}>COLORS</div>
            <div className="swatches">
              {WASHI_COLORS.map(([a, b]) => (
                <button key={a} className={'sw' + (washi.c1 === a ? ' on' : '')} style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }}
                  aria-label={'Tape colors ' + a} onClick={() => setWashi({ ...washi, c1: a, c2: b })} />
              ))}
              <label className="sw custom" title="Custom main color"><input type="color" value={washi.c1} onChange={(e) => setWashi({ ...washi, c1: e.target.value })} aria-label="Custom tape color" /></label>
            </div>
            <label className="slider" style={{ marginTop: 10 }}>Width <span>{washi.width}</span>
              <input type="range" min="24" max="90" value={washi.width} onChange={(e) => setWashi({ ...washi, width: +e.target.value })} />
            </label>
            <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={() => onWashi(washi)}>Use this tape</button>
          </>
        )}

        {tab === 'sticky' && (
          <>
            <p className="hint">Tap a color to add a sticky note, then type on it.</p>
            <div className="stgrid">
              {STICKY_COLORS.map((c) => (
                <button key={c} className="sttile" onClick={() => onPlace('sticky', { color: c, text: '' }, 260, 260)} aria-label={'Sticky note ' + c}>
                  <span className="stickydemo" style={{ background: c }} />
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'shapes' && (
          <>
            <p className="hint">Shapes use your current pen color. Change outline, fill, and thickness after placing. Tap ☆ on a selected shape to save it here.</p>
            {(settings.shapeFavs || []).length > 0 && <>
              <div className="ptitle small" style={{ marginTop: 10 }}>FAVORITES</div>
              <div className="stgrid">
                {settings.shapeFavs.map((f, i) => (
                  <button key={i} className="sttile" aria-label={'Favorite ' + f.shape}
                    onClick={() => onPlace('shape', { shape: f.shape, stroke: f.stroke, fill: f.fill, sw: f.sw }, f.w || 200, f.h || 200)}
                    onContextMenu={(e) => { e.preventDefault(); if (confirm('Remove this favorite shape?')) update({ shapeFavs: settings.shapeFavs.filter((_, j) => j !== i) }); }}>
                    <svg viewBox="-4 -4 108 108" className="thumb"><path d={SHAPES[f.shape]} fill={f.fill || 'none'} stroke={f.stroke} strokeWidth={Math.max(2, f.sw ?? 4)} strokeLinejoin="round" /></svg>
                  </button>
                ))}
              </div>
              <div className="ptitle small" style={{ marginTop: 10 }}>ALL SHAPES</div>
            </>}
            <div className="stgrid">
              {Object.entries(SHAPES).map(([k, d]) => {
                const wide = ['arrow', 'banner', 'speech'].includes(k);
                return (
                  <button key={k} className="sttile" aria-label={k} onClick={() => onPlace('shape', { shape: k, stroke: penColor, fill: 'none', sw: 4 }, wide ? 280 : 200, wide ? 180 : 200)}>
                    <svg viewBox="-4 -4 108 108" className="thumb"><path d={d} fill="none" stroke="#d9cfc2" strokeWidth="5" strokeLinejoin="round" /></svg>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <button className="btn primary" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>Done</button>
      </section>
    </>
  );
}

import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { DOCK_BUTTONS, dockOrder } from './dockButtons';
import { outline, toPath } from './geom';

export const STAB_DEFAULT = { ballpoint: 0.35, fineliner: 0.4, fountain: 0.3, pencil: 0.3, highlighter: 0.4 };
export const stabOf = (tool, cfg) => {
  const k = tool === 'pen' ? cfg.type || 'ballpoint' : 'highlighter';
  return cfg.stabilize?.[k] ?? STAB_DEFAULT[k];
};

// A sample squiggle with a press-light-press pressure curve, drawn with the real pen engine.
const SAMPLE = Array.from({ length: 40 }, (_, i) => { const t = i / 39; return [10 + t * 180, 30 + Math.sin(t * Math.PI * 2) * 14, 0.15 + 0.85 * Math.sin(t * Math.PI)]; });
export function StrokePreview({ cfg, tool, paper = '#f4ebdd', h = 60 }) {
  const size = tool === 'pen' ? cfg.size * 1.4 : cfg.size;
  const d = toPath(outline(SAMPLE, tool, size, null, tool === 'pen' ? cfg.type || 'ballpoint' : cfg.taper ? 'tapered' : null, stabOf(tool, cfg)));
  return (
    <svg viewBox="0 0 200 60" style={{ width: '100%', height: h, display: 'block', background: paper, borderRadius: 10 }} aria-hidden="true">
      <path d={d} fill={cfg.color} opacity={cfg.opacity} style={tool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined} />
    </svg>
  );
}

export const TOOLS = [
  { id: 'pointer', label: 'Pointer (click trackers, no ink)', cls: 't-pt', pcOnly: true },
  { id: 'pen', label: 'Pen', cls: 't-pen' },
  { id: 'text', label: 'Text box', cls: 't-tx' },
  { id: 'highlighter', label: 'Highlighter', cls: 't-hl' },
  { id: 'eraser', label: 'Eraser', cls: 't-er' },
  { id: 'lasso', label: 'Lasso', cls: 't-la' },
];

export function Toolbar({ tool, onTool, vertical, onUndo, onRedo, onPanel, onMore, onPages, onFocus, favs }) {
  return (
    <nav className={vertical ? 'vtools' : 'htools'} aria-label="Tools">
      {TOOLS.filter((t) => vertical || !t.pcOnly).map((t) => (
        <button key={t.id} className={`tool ${t.cls}${tool === t.id ? ' on' : ''}`} title={t.label} aria-label={t.label}
          disabled={t.disabled} onClick={() => onTool(t.id)}>
          <Icon n={t.id} s={22} dash={t.id === 'lasso'} />
        </button>
      ))}
      <button className={'tool t-st' + (tool === 'washi' ? ' on' : '')} title={tool === 'washi' ? 'Washi tape (drag to lay tape)' : 'Stickers, washi, notes, shapes'} aria-label="Stickers" onClick={() => onTool('stickers')}><Icon n="sticker" s={21} /></button>
      {onPages && <button className="tool" title="Pages & paper: reorder, add, delete, paper style and shape" aria-label="Pages and paper" onClick={onPages}><Icon n="pages" s={20} /></button>}
      {onFocus && <button className="tool" title="Focus mode: hide everything but the page" aria-label="Focus mode" onClick={onFocus}><Icon n="expand" s={20} /></button>}
      {vertical && <>
        {favs && <><span className="vsep" />{favs}</>}
        <span className="vsep" />
        <button className="tool" title="Show or hide tool settings" aria-label="Tool settings" onClick={onPanel}><Icon n="sliders" s={20} /></button>
        <button className="tool" title="Undo (Ctrl+Z)" aria-label="Undo" onClick={onUndo}><Icon n="undo" s={18} /></button>
        <button className="tool" title="Redo (Ctrl+Y)" aria-label="Redo" onClick={onRedo}><Icon n="redo" s={18} /></button>
        <button className="tool" title="Page settings" aria-label="Page settings" onClick={onMore}><Icon n="more" s={20} /></button>
      </>}
    </nav>
  );
}

export function FavStrip({ settings, update, applyFav, vertical }) {
  const isActive = (f) => {
    const cur = settings[f.tool] || {};
    return ['color', 'size', 'opacity', 'type'].every((k) => f[k] === undefined || f[k] === cur[k]) && settings.activeTool === f.tool;
  };
  const favs = settings.favorites || [];
  const remove = (i) => {
    if (confirm('Remove this favorite?')) update({ favorites: favs.filter((_, j) => j !== i) });
  };
  if (!favs.length) return null;
  return (
    <div className={vertical ? 'vfavs' : 'favs'} aria-label="Favorite tools">
      {favs.map((f, i) => (
        <button key={i} className={'fav' + (isActive(f) ? ' on' : '')} title={`${f.tool === 'pen' ? f.type || 'pen' : 'highlighter'} · right-click or long-press to remove`} onClick={() => applyFav(f)}
          onContextMenu={(e) => { e.preventDefault(); remove(i); }}>
          <StrokePreview cfg={f} tool={f.tool} paper={settings.paperColor} h={28} />
        </button>
      ))}
    </div>
  );
}

const PAPER_COLORS = ['#f4ebdd', '#fffaf1', '#e6eadf', '#ece4f0', '#dfe8ee', '#1e1d1b'];

export function ToolPanel(props) {
  const { tool, settings, update } = props;
  if (tool === 'lasso') {
    return (
      <div className="tpanel">
        <div className="ptitle hand">Lasso</div>
        <div className="ptitle small">SELECTS</div>
        <div className="seg wrap2">
          {[['all', 'Everything'], ['pen', 'Pen only'], ['highlighter', 'Highlighter only'], ['items', 'Stickers & items']].map(([id, l]) => (
            <button key={id} className={(settings.lassoFilter || 'all') === id ? 'on' : ''} onClick={() => update({ lassoFilter: id })}>{l}</button>
          ))}
        </div>
        <p className="hint">Loop around things to select them, or tap a sticker, note, or photo.</p>
      </div>
    );
  }
  return <PenPanel {...props} />;
}

function PenPanel({ tool, drawTool, settings, update, onTool }) {
  const [edit, setEdit] = useState(false);
  const [saved, setSaved] = useState(false);
  const t = tool === 'pen' || tool === 'highlighter' ? tool : drawTool;
  const cfg = settings[t];
  const setCfg = (patch) => update((s) => ({ [t]: { ...s[t], ...patch } }));
  const pal = settings.palettes[settings.activePalette] || settings.palettes[0];
  const setPal = (colors) => update((s) => ({ palettes: s.palettes.map((p, i) => (i === s.activePalette ? { ...p, colors } : p)) }));
  // Reorder palettes (drag a row, or the arrows); the one you have open stays open.
  const movePalette = (from, to) => update((s) => {
    if (from === to || to < 0 || to >= s.palettes.length) return {};
    const l = [...s.palettes], [x] = l.splice(from, 1); l.splice(to, 0, x);
    return { palettes: l, activePalette: l.indexOf(s.palettes[s.activePalette]) };
  });

  return (
    <div className="tpanel">
      {tool === 'eraser' ? (
        <>
          <div className="ptitle hand">Eraser</div>
          <div className="seg">
            {[['stroke', 'Whole stroke'], ['partial', 'Partial'], ['precise', 'Precise']].map(([id, l]) => (
              <button key={id} className={settings.eraser.mode === id ? 'on' : ''} onClick={() => update((s) => ({ eraser: { ...s.eraser, mode: id } }))}>{l}</button>
            ))}
          </div>
          <label className="slider">Size <span>{settings.eraser.size}</span>
            <input type="range" min="1" max="60" value={settings.eraser.size} onChange={(e) => update((s) => ({ eraser: { ...s.eraser, size: +e.target.value } }))} />
          </label>
          <div className="ptitle small">ERASES</div>
          <div className="seg">
            {[['all', 'Everything'], ['pen', 'Pen only'], ['highlighter', 'Highlighter only']].map(([id, l]) => (
              <button key={id} className={(settings.eraser.filter || 'all') === id ? 'on' : ''} onClick={() => update((s) => ({ eraser: { ...s.eraser, filter: id } }))}>{l}</button>
            ))}
          </div>
          <p className="hint">Tip: double-tap with the pen or a finger to switch between pen and eraser.</p>
        </>
      ) : (
        <>
          <div className="prow">
            <span className="ptitle hand">{t === 'pen' ? 'Pen' : 'Highlighter'}</span>
            <button className="mini" onClick={() => {
              update((s) => {
                const fav = { tool: t, ...s[t] };
                const same = (s.favorites || []).some((f) => JSON.stringify(f) === JSON.stringify(fav));
                return same ? {} : { favorites: [...(s.favorites || []), fav] };
              });
              setSaved(true); setTimeout(() => setSaved(false), 1500);
            }}>
              <Icon n="star" s={14} /> {saved ? 'Saved ✓' : 'Save as fave'}
            </button>
          </div>
          <StrokePreview cfg={cfg} tool={t} paper={settings.paperColor} />
          {t === 'highlighter' && (
            <div className="seg">
              {[[false, 'Flat ends'], [true, 'Tapered ends']].map(([v, l]) => (
                <button key={l} className={!!cfg.taper === v ? 'on' : ''} onClick={() => setCfg({ taper: v })}>{l}</button>
              ))}
            </div>
          )}
          {t === 'pen' && (
            <div className="seg">
              {[['ballpoint', 'Ballpoint'], ['fineliner', 'Fineliner'], ['fountain', 'Fountain'], ['pencil', 'Pencil']].map(([id, l]) => (
                <button key={id} className={(cfg.type || 'ballpoint') === id ? 'on' : ''} onClick={() => setCfg({ type: id })}>{l}</button>
              ))}
            </div>
          )}
          <label className="slider">Thickness <span>{cfg.size}</span>
            <input type="range" min={t === 'pen' ? 1 : 2} max={t === 'pen' ? 24 : 60} value={cfg.size} onChange={(e) => setCfg({ size: +e.target.value })} />
          </label>
          <label className="slider">Stabilize <span>{Math.round(stabOf(t, cfg) * 100)}%</span>
            <input type="range" min="0" max="100" value={Math.round(stabOf(t, cfg) * 100)} onChange={(e) => {
              const k = t === 'pen' ? cfg.type || 'ballpoint' : 'highlighter';
              setCfg({ stabilize: { ...(cfg.stabilize || {}), [k]: +e.target.value / 100 } });
            }} />
          </label>
          <label className="slider">Opacity <span>{Math.round(cfg.opacity * 100)}%</span>
            <input type="range" min="10" max="100" value={Math.round(cfg.opacity * 100)} onChange={(e) => setCfg({ opacity: +e.target.value / 100 })} />
          </label>
          <details className="pfold" open={localStorage.getItem('pfold-opts') === '1' || undefined} onToggle={(e) => { try { localStorage.setItem('pfold-opts', e.currentTarget.open ? '1' : '0'); } catch { /* private mode */ } }}>
          <summary>Pen options</summary>
          <label className="toggle" title="Off by default: dabbing dots and coloring small spots can look like a double-tap">
            <input type="checkbox" checked={!!settings.penDoubleTap} onChange={(e) => update({ penDoubleTap: e.target.checked })} />
            <span>Double-tap pen for eraser <small>finger double-tap always works</small></span>
          </label>
          <label className="toggle" title="Hold the S Pen button as you start a stroke to erase">
            <input type="checkbox" checked={!!settings.penButton} onChange={(e) => update({ penButton: e.target.checked })} />
            <span>Pen button erases <small>hold it as you start a stroke</small></span>
          </label>
          {t === 'pen' && (
            <label className="toggle" title="Shows a guideline while you write and levels lines that drift uphill or downhill">
              <input type="checkbox" checked={!!settings.writeAssist} onChange={(e) => update({ writeAssist: e.target.checked })} />
              <span>Writing assist <small>guideline + straighten lines</small></span>
            </label>
          )}
          {t === 'pen' && (
            <label className="toggle" title="The little pill with eraser, next line and move right that shows when you zoom in on your phone">
              <input type="checkbox" checked={!settings.zdockHidden} onChange={(e) => update({ zdockHidden: !e.target.checked })} />
              <span>Writing dock <small>shows on phone when zoomed in · drag ⋮⋮ to move, corner to resize</small></span>
            </label>
          )}
          {t === 'pen' && !settings.zdockHidden && (
            <details className="pfold sub"><summary>Dock buttons</summary>
            <div className="dockcfg">
              {dockOrder(settings.zdockOrder).map((id, i, arr) => {
                const off = (settings.zdockOff || []).includes(id);
                const move = (d) => { const n = [...arr]; [n[i], n[i + d]] = [n[i + d], n[i]]; update({ zdockOrder: n }); };
                return (
                  <div key={id} className={'dockrow' + (off ? ' off' : '')}>
                    <input type="checkbox" checked={!off} aria-label={'Show ' + id} onChange={() => update({ zdockOff: off ? (settings.zdockOff || []).filter((x) => x !== id) : [...(settings.zdockOff || []), id] })} />
                    <span>{DOCK_BUTTONS.find((b) => b[0] === id)[1]}</span>
                    <button className="ib" aria-label="Move earlier" disabled={i === 0} onClick={() => move(-1)}>▲</button>
                    <button className="ib" aria-label="Move later" disabled={i === arr.length - 1} onClick={() => move(1)}>▼</button>
                  </div>
                );
              })}
            </div>
            </details>
          )}
          </details>
        </>
      )}

      {tool !== 'eraser' && (
        <div className="palette">
          <div className="prow">
            <select value={settings.activePalette} onChange={(e) => update({ activePalette: +e.target.value })} aria-label="Palette">
              {settings.palettes.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
            </select>
            <button className={'mini' + (tool === 'eyedropper' ? ' on' : '')} title="Eyedropper" aria-label="Eyedropper"
              onClick={() => onTool('eyedropper')}><Icon n="drop" s={14} /></button>
            <button className="mini" onClick={() => setEdit((v) => !v)}>{edit ? 'Done' : 'Edit'}</button>
          </div>
          <div className="swatches">
            {pal.colors.map((c, i) => edit ? (
              <span key={i} className="sw edit" style={{ background: c }}>
                <input type="color" value={c} aria-label="Change color" onChange={(e) => setPal(pal.colors.map((x, j) => (j === i ? e.target.value : x)))} />
                <button className="swx" aria-label="Remove color" onClick={() => setPal(pal.colors.filter((_, j) => j !== i))}>×</button>
              </span>
            ) : (
              <button key={i} className={'sw' + (cfg.color === c ? ' on' : '')} style={{ background: c }} aria-label={'Color ' + c}
                onClick={() => setCfg({ color: c })} />
            ))}
            <button className="sw add" title="Add current color" aria-label="Add current color to palette"
              onClick={() => !pal.colors.includes(cfg.color) && setPal([...pal.colors, cfg.color])}>+</button>
            <label className="sw custom" title="Custom color" style={{ background: cfg.color }}>
              <input type="color" value={cfg.color} aria-label="Custom color" onChange={(e) => setCfg({ color: e.target.value })} />
            </label>
          </div>
          {edit && (
            <div className="prow">
              <button className="mini" onClick={() => {
                const name = prompt('Name for the new palette?');
                if (name) update((s) => ({ palettes: [...s.palettes, { name, colors: [cfg.color] }], activePalette: s.palettes.length }));
              }}>+ New palette</button>
              <button className="mini" onClick={() => {
                const name = prompt('Rename palette', pal.name);
                if (name) update((s) => ({ palettes: s.palettes.map((p, i) => (i === s.activePalette ? { ...p, name } : p)) }));
              }}>Rename</button>
              {settings.palettes.length > 1 && <button className="mini danger" onClick={() => {
                if (confirm(`Delete the "${pal.name}" palette?`)) update((s) => ({ palettes: s.palettes.filter((_, i) => i !== s.activePalette), activePalette: 0 }));
              }}>Delete</button>}
            </div>
          )}
          {edit && settings.palettes.length > 1 && (
            <div className="palorder">
              <div className="lbl">PALETTE ORDER</div>
              {settings.palettes.map((p, i) => (
                <div key={i} className={'palrow' + (i === settings.activePalette ? ' on' : '')} draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/x-pal', String(i)); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => { if ([...e.dataTransfer.types].includes('text/x-pal')) e.preventDefault(); }}
                  onDrop={(e) => { const from = +e.dataTransfer.getData('text/x-pal'); if (!Number.isNaN(from)) movePalette(from, i); }}>
                  <span className="palgrip" aria-hidden="true">⋮⋮</span>
                  <button className="palname" onClick={() => update({ activePalette: i })}>{p.name}</button>
                  <span className="palmini">{p.colors.slice(0, 6).map((c, j) => <i key={j} style={{ background: c }} />)}</span>
                  <button className="mini" aria-label={'Move ' + p.name + ' up'} disabled={i === 0} onClick={() => movePalette(i, i - 1)}>↑</button>
                  <button className="mini" aria-label={'Move ' + p.name + ' down'} disabled={i === settings.palettes.length - 1} onClick={() => movePalette(i, i + 1)}>↓</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export function PaperPanel({ settings, update, page, onPagePaper, top, onPageShape }) {
  const [scope, setScope] = useState(page?.paper ? 'page' : 'all');
  const own = page?.paper || null;
  const style = scope === 'page' ? own?.style || settings.paperStyle : settings.paperStyle;
  const color = scope === 'page' ? own?.color || settings.paperColor : settings.paperColor;
  const set = (patch) => {
    if (scope === 'page' && page) onPagePaper({ style, color, ...patch });
    else update({ paperStyle: patch.style ?? settings.paperStyle, paperColor: patch.color ?? settings.paperColor });
  };
  return (
    <div className="paperset">
      {top}
      {page && onPageShape && <>
        <div className="ptitle small">PAGE SHAPE</div>
        <div className="seg" style={{ marginBottom: 12 }}>
          <button className={page.content?.shape !== 'tall' ? 'on' : ''} onClick={() => onPageShape('standard')}>Standard</button>
          <button className={page.content?.shape === 'tall' ? 'on' : ''} onClick={() => onPageShape('tall')}>Tall (fits phones)</button>
        </div>
      </>}
      <div className="ptitle small">PAPER</div>
      {page && (
        <div className="seg">
          <button className={scope === 'page' ? 'on' : ''} onClick={() => setScope('page')}>This page</button>
          <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>All pages</button>
        </div>
      )}
      <div className="seg">
        {['blank', 'lined', 'grid', 'dots'].map((x) => (
          <button key={x} className={style === x ? 'on' : ''} onClick={() => set({ style: x })}>{x[0].toUpperCase() + x.slice(1)}</button>
        ))}
      </div>
      <div className="swatches">
        {PAPER_COLORS.map((c) => (
          <button key={c} className={'sw' + (color === c ? ' on' : '')} style={{ background: c }} aria-label={'Paper ' + c} onClick={() => set({ color: c })} />
        ))}
      </div>
      <ColorPicker value={color} onChange={(c) => set({ color: c })} />
      <p className="hint">{scope === 'page'
        ? (own ? 'This page has its own paper.' : 'Changes here apply only to this page.')
        : 'Applies to every page that doesn\'t have its own paper. Same on every device.'}</p>
      {scope === 'page' && own && <button className="mini" onClick={() => onPagePaper(null)}>Reset this page to the journal default</button>}
    </div>
  );
}

export const TAB_COLORS = ['#6f8f62', '#a7c0d4', '#e3c5b8', '#d4b48b', '#c4b2d6', '#cf826d', '#98a487', '#6e819c', '#e8c97a'];
export const inkOn = (hex) => {
  if (!hex) return undefined;
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150 ? '#2b2219' : '#fbf4ea';
};

/* ---------- color wheel + hex ---------- */
const clamp01 = (n) => Math.min(1, Math.max(0, n));
export function hexToHsv(hex) {
  const n = parseInt((hex || '#000000').slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, mx ? d / mx : 0, mx];
}
export function hsvToHex(h, s, v) {
  const f = (k) => { const x = (k + h / 60) % 6; return v - v * s * Math.max(0, Math.min(x, 4 - x, 1)); };
  return '#' + [f(5), f(3), f(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
}
export function ColorPicker({ value, onChange, onDrop }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hex, setHex] = useState(value);
  const last = useRef(value);
  useEffect(() => { if (value && value !== last.current) { last.current = value; setHsv(hexToHsv(value)); setHex(value); } }, [value]);
  const emit = (h, s, v) => { const x = hsvToHex(h, s, v); last.current = x; setHsv([h, s, v]); setHex(x); onChange(x); };
  const disc = useRef();
  const pick = (e) => {
    const r = disc.current.getBoundingClientRect(), R = r.width / 2;
    const dx = e.clientX - r.left - R, dy = e.clientY - r.top - R;
    emit((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360, clamp01(Math.hypot(dx, dy) / R), hsv[2] || 1);
  };
  const [h, sat, v] = hsv;
  const hx = 50 + 50 * sat * Math.sin(h * Math.PI / 180), hy = 50 - 50 * sat * Math.cos(h * Math.PI / 180);
  return (
    <div className="cpick">
      <div ref={disc} className="cwheel" style={{ filter: `brightness(${0.15 + 0.85 * v})` }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); }}
        onPointerMove={(e) => e.buttons && pick(e)} role="slider" aria-label="Hue and saturation">
        <span className="chandle" style={{ left: hx + '%', top: hy + '%', background: hsvToHex(h, sat, v) }} />
      </div>
      <label className="slider">Brightness <span>{Math.round(v * 100)}%</span>
        <input type="range" min="0" max="100" value={Math.round(v * 100)} onChange={(e) => emit(h, sat, +e.target.value / 100)}
          style={{ background: `linear-gradient(90deg,#000,${hsvToHex(h, sat, 1)})` }} className="brightness" />
      </label>
      <label className="slider">Saturation <span>{Math.round(sat * 100)}%</span>
        <input type="range" min="0" max="100" value={Math.round(sat * 100)} onChange={(e) => emit(h, +e.target.value / 100, v)}
          style={{ background: `linear-gradient(90deg,${hsvToHex(h, 0, v)},${hsvToHex(h, 1, v)})` }} className="brightness" />
      </label>
      <label className="hexrow">Hex
        <input value={hex} maxLength={7} onChange={(e) => {
          let x = e.target.value.trim(); if (!x.startsWith('#')) x = '#' + x; setHex(x);
          if (/^#[0-9a-fA-F]{6}$/.test(x)) { last.current = x.toLowerCase(); setHsv(hexToHsv(x)); onChange(x.toLowerCase()); }
        }} spellCheck={false} />
        <span className="hexsw" style={{ background: /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : 'transparent' }} />
        {onDrop && <button type="button" className="hexdrop" title="Eyedropper: pick a color from the page" aria-label="Eyedropper" onClick={(e) => { e.preventDefault(); onDrop(); }}><Icon n="drop" s={18} /></button>}
      </label>
    </div>
  );
}

export function TabSheet({ label, name, color, canEdit, canPin = true, pinned, presets, onPresets, onSave, onDelete, onClose }) {
  const [v, setV] = useState(name || '');
  const [c, setC] = useState(color || null);
  const [pin, setPin] = useState(!!pinned);
  const [editP, setEditP] = useState(false);
  const [editing, setEditing] = useState(-1);
  const save = () => { onSave({ name: v.trim() || name, color: c, pinned: pin }); onClose(); };
  const setColor = (x) => {
    setC(x);
    if (editP && editing >= 0) onPresets(presets.map((p, i) => (i === editing ? x : p)));
  };
  return (
    <>
      <div className="sheet-bg" onClick={save} />
      <section className="sheet" aria-label="Edit tab">
        <div className="grab" />
        <div className="ptitle hand">{label}</div>
        {canEdit && (
          <label className="field">Name
            <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          </label>
        )}
        {canEdit && canPin && (
          <label className="pinrow">
            <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} />
            <span><b>Pin next to Week</b><br /><small>{pin ? "Shows on every week. Unpin to move it back to the week you're on." : 'Show this page on every week.'}</small></span>
          </label>
        )}
        <div className="prow" style={{ marginTop: 14 }}>
          <span className="ptitle small">TAB COLOR</span>
          <button className="mini" onClick={() => { setEditP((x) => !x); setEditing(-1); }}>{editP ? 'Done editing' : 'Edit presets'}</button>
        </div>
        {editP && <p className="hint">Tap a preset to change it with the wheel below. × removes it.</p>}
        <div className="swatches" style={{ marginTop: 8 }}>
          {!editP && <button className={'sw none' + (!c ? ' on' : '')} aria-label="Default color" onClick={() => setC(null)}>×</button>}
          {presets.map((x, i) => (
            <span key={i} className="swwrap">
              <button className={'sw' + ((editP ? editing === i : c === x) ? ' on' : '')} style={{ background: x }} aria-label={'Preset ' + x}
                onClick={() => { setC(x); if (editP) setEditing(i); }} />
              {editP && <button className="swx" aria-label="Remove preset" onClick={() => { onPresets(presets.filter((_, j) => j !== i)); setEditing(-1); }}>×</button>}
            </span>
          ))}
          <button className="sw add" title="Save current color as a preset" aria-label="Add current color as a preset"
            onClick={() => c && !presets.includes(c) && onPresets([...presets, c])}>+</button>
        </div>
        <ColorPicker value={c || '#6f8f62'} onChange={setColor} />
        <div className="prow" style={{ marginTop: 16 }}>
          {canEdit ? <button className="mini danger" onClick={() => { if (confirm(`Delete "${name}" and everything on it?`)) { onDelete(); onClose(); } }}><Icon n="trash" s={14} /> Delete page</button> : <span />}
          <button className="btn primary" onClick={save}>Done</button>
        </div>
      </section>
    </>
  );
}

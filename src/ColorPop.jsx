import { useEffect, useRef, useState } from 'react';
import { ColorPicker } from './Tools';

// Color pop-out from the dock's color dot: wheel on top, recent colors, then your palettes.
// Order of indexes after moving one from `from` to slot `to`.
const moveIdx = (n, from, to) => { const a = [...Array(n).keys()]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a; };

export default function ColorPop({ settings, update, tool, anchor, onClose, onDrop }) {
  const key = tool === 'highlighter' ? 'highlighter' : 'pen';
  const color = settings[key]?.color || '#3d3121';
  const [edit, setEdit] = useState(false);
  const pal = settings.palettes[settings.activePalette] || settings.palettes[0];
  const recent = settings.recentColors || [];
  const picked = useRef(null);
  const setColor = (c, remember) => {
    update((s) => ({ [key]: { ...s[key], color: c } }));
    picked.current = c;
    if (remember) remember();
  };
  const remember = (c) => update((s) => ({ recentColors: [c, ...(s.recentColors || []).filter((x) => x !== c)].slice(0, 12) }));
  // Wheel changes are remembered once, when the pop-out closes.
  useEffect(() => () => { if (picked.current) remember(picked.current); }, []);
  const setPal = (colors) => update((s) => ({ palettes: s.palettes.map((p, i) => (i === s.activePalette ? { ...p, colors } : p)) }));
  // Reorder palettes: move the open one earlier/later in the list (it stays selected).
  const movePal = (dir) => update((s) => {
    const a = s.activePalette, b = a + dir; if (b < 0 || b >= s.palettes.length) return {};
    const palettes = [...s.palettes]; [palettes[a], palettes[b]] = [palettes[b], palettes[a]];
    return { palettes, activePalette: b };
  });
  // Drag a swatch (in Edit) to a new spot.
  const rowRef = useRef(null);
  const [drag, setDrag] = useState(null);
  // Pick a swatch up: it follows your finger, and the others slide over to open a gap where it will land.
  function startDrag(e, from) {
    e.preventDefault();
    const slots = [...rowRef.current.querySelectorAll('[data-i]')].map((el) => { const b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
    let to = from;
    setDrag({ from, to, x: e.clientX, y: e.clientY });
    const mv = (ev) => {
      let best = to, bd = Infinity;
      slots.forEach(([cx, cy], k) => { const dd = Math.hypot(ev.clientX - cx, (ev.clientY - cy) * 1.4); if (dd < bd) { bd = dd; best = k; } });
      to = best; setDrag({ from, to, x: ev.clientX, y: ev.clientY });
    };
    const up = () => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
      setDrag(null);
      if (to !== from) { const cs = [...pal.colors]; const [c] = cs.splice(from, 1); cs.splice(to, 0, c); setPal(cs); }
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }

  // Sit beside the dock (left or right, whichever has room).
  const r = anchor?.getBoundingClientRect?.();
  const left = r ? (r.left > innerWidth / 2 ? Math.max(8, r.left - 312) : Math.min(innerWidth - 308, r.right + 8)) : 8;
  const top = r ? Math.max(8, Math.min(innerHeight - 420, r.top)) : 80;
  return (
    <>
      <div className="cpop-bg" onPointerDown={onClose} />
      <div className="cpop" style={{ left, top }} role="dialog" aria-label="Colors" onPointerDown={(e) => e.stopPropagation()}>
        <ColorPicker value={color} onChange={(c) => setColor(c)} onDrop={onDrop && (() => { onClose(); onDrop(); })} />
        {recent.length > 0 && <>
          <div className="ptitle small">RECENT</div>
          <div className="cprow">{recent.map((c) => <button key={c} className={'sw' + (c === color ? ' on' : '')} style={{ background: c }} aria-label={'Recent ' + c} onClick={() => { setColor(c); remember(c); }} />)}</div>
        </>}
        <div className="cphead">
          <select value={settings.activePalette} onChange={(e) => update({ activePalette: +e.target.value })} aria-label="Palette">
            {settings.palettes.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
          </select>
          <button className="mini" onClick={() => { const name = (prompt('Name the new palette') || '').trim(); if (name) update((s) => ({ palettes: [...s.palettes, { name, colors: [color] }], activePalette: s.palettes.length })); }}>+ New</button>
          <button className={'mini' + (edit ? ' on' : '')} onClick={() => setEdit((v) => !v)}>{edit ? 'Done' : 'Edit'}</button>
        </div>
        {edit && (
          <div className="cpedit">
            <span className="hint">Drag colors to reorder.</span>
            <div className="cpeditbtns">
              <button className="mini" disabled={settings.activePalette === 0} title="Move this palette earlier" onClick={() => movePal(-1)}>← Move</button>
              <button className="mini" disabled={settings.activePalette >= settings.palettes.length - 1} title="Move this palette later" onClick={() => movePal(1)}>Move →</button>
              <button className="mini" onClick={() => { const name = (prompt('Rename palette', pal.name) || '').trim(); if (name) update((s) => ({ palettes: s.palettes.map((p, i) => (i === s.activePalette ? { ...p, name } : p)) })); }}>Rename</button>
              {settings.palettes.length > 1 && <button className="mini danger" onClick={() => { if (confirm(`Delete the “${pal.name}” palette?`)) update((s) => ({ palettes: s.palettes.filter((_, i) => i !== s.activePalette), activePalette: Math.max(0, s.activePalette - 1) })); }}>Delete</button>}
            </div>
          </div>
        )}
        <div className="cprow" ref={rowRef}>
          {(drag ? moveIdx(pal.colors.length, drag.from, drag.to) : pal.colors.map((_, i) => i)).map((i, slot) => [pal.colors[i], i, slot]).map(([c, i, slot]) => (
            <span key={c + i} className={'swwrap' + (drag?.from === i ? ' lifting' : '')} data-i={slot}>
              <button className={'sw' + (c === color ? ' on' : '')} style={{ background: c, touchAction: edit ? 'none' : undefined }} aria-label={'Palette ' + c}
                onClick={() => { if (!edit) { setColor(c); remember(c); } }}
                onPointerDown={edit ? (e) => startDrag(e, i) : undefined} />
              {edit && <button className="swx" aria-label="Remove from palette" onClick={() => setPal(pal.colors.filter((_, j) => j !== i))}>×</button>}
            </span>
          ))}
          {drag && <span className="swghost" style={{ left: drag.x, top: drag.y, background: pal.colors[drag.from] }} />}
          <button className="sw cpadd" aria-label="Add this color to the palette" title="Add the current color" onClick={() => !pal.colors.includes(color) && setPal([...pal.colors, color])}>+</button>
        </div>
      </div>
    </>
  );
}

import { useState } from 'react';
import { Thumb } from './Drawer';

// Save a lasso drawing as a sticker: name it, pick a folder (type to filter; new names make a new folder), add tags.
export default function SaveSticker({ draft, cats, last, onSave, onClose }) {
  const [name, setName] = useState('');
  const [cat, setCat] = useState(last && cats.includes(last) ? last : cats[0] || '');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [tags, setTags] = useState('');
  const q = cat.trim().toLowerCase();
  const matches = cats.filter((c) => c.toLowerCase().includes(q));
  const exact = cats.some((c) => c.toLowerCase() === q);
  const opts = [...matches.map((c) => ({ c })), ...(q && !exact ? [{ c: cat.trim(), make: true }] : [])];
  const pick = (o) => { setCat(o.c); setOpen(false); };
  const save = () => {
    const c = (cats.find((x) => x.toLowerCase() === q) || cat.trim()) || 'My stickers';
    onSave({ name: name.trim(), category: c, tags: tags.toLowerCase().split(',').map((t) => t.trim()).filter(Boolean) });
  };
  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <section className="sheet savest" aria-label="Save as sticker">
        <div className="grab" />
        <div className="ptitle hand">Save as sticker</div>
        <div className="savest-row">
          <div className="savest-prev"><Thumb st={{ src: 'strokes', strokes: draft.strokes, w0: draft.w0, h0: draft.h0 }} /></div>
          <div className="savest-fields">
            <label className="field">Name<input value={name} autoFocus placeholder="e.g. little moon doodle" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></label>
            <label className="field savest-cat">Folder
              <input value={cat} placeholder="Start typing a folder…" onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
                onChange={(e) => { setCat(e.target.value); setOpen(true); setHi(0); }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(opts.length - 1, h + 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
                  else if (e.key === 'Enter') { e.preventDefault(); if (open && opts[hi]) pick(opts[hi]); else save(); }
                  else if (e.key === 'Escape') setOpen(false);
                }} />
              {open && opts.length > 0 && (
                <div className="savest-drop" role="listbox">
                  {opts.map((o, i) => (
                    <button key={(o.make ? '+' : '') + o.c} type="button" className={(i === hi ? 'on' : '') + (o.make ? ' make' : '')} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o)}>
                      {o.make ? <>+ Create folder “<b>{o.c}</b>”</> : o.c}
                    </button>
                  ))}
                </div>
              )}
            </label>
            {q && !exact && !open && <p className="hint" style={{ margin: '4px 0 0' }}>New folder “{cat.trim()}” will be made.</p>}
            <label className="field">Tags <small>(optional, commas)</small><input value={tags} placeholder="pink, doodle, moon" onChange={(e) => setTags(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></label>
          </div>
        </div>
        <div className="prow" style={{ marginTop: 14, justifyContent: 'flex-end', gap: 8 }}>
          <button className="mini" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save sticker</button>
        </div>
      </section>
    </>
  );
}

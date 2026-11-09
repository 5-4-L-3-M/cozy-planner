import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { loadIndex } from './store';

// Tag looks are saved per tag (case doesn't matter) in settings.tagStyles.
export const TagCtx = createContext({});
// Priority highlight colors (1 = low, 2 = medium, 3 = high) live alongside tag looks.
export const DEFAULT_PRIO = ['#b9dca0', '#f3d98a', '#f2a7a7']; // green, yellow, red
export const PrioCtx = createContext(DEFAULT_PRIO);
export const DEFAULT_TAG = { bg: '#e6eef6', border: '#a7c4f2', text: '#4f6f8f' };
export const TAG_LOOKS = [
  { bg: '#e6eef6', border: '#a7c4f2', text: '#4f6f8f' },
  { bg: '#fbe4e9', border: '#e8a9b6', text: '#a3485c' },
  { bg: '#fbf0cf', border: '#e8c766', text: '#8a6a1f' },
  { bg: '#e4ecdb', border: '#98a487', text: '#4f6a3c' },
  { bg: '#ece4f0', border: '#c4b2d6', text: '#6e4f8a' },
  { bg: '#f6dfd6', border: '#cf826d', text: '#8f4a37' },
  { bg: '#dcefee', border: '#7fb3b0', text: '#2f6a67' },
  { bg: '#3d3121', border: '#3d3121', text: '#fbf4ea' },
];
export const tagKey = (t) => t.toLowerCase();
export function useTagLook(tag) {
  const styles = useContext(TagCtx);
  return styles[tagKey(tag)] || DEFAULT_TAG;
}
export function TagPill({ tag, onClick, count }) {
  const l = useTagLook(tag);
  return (
    <button className="tagpill" style={{ background: l.bg, borderColor: l.border, color: l.text }} onClick={onClick}>
      {tag}{count != null && <b>{count}</b>}
    </button>
  );
}

export function TagManager({ nbId, year, styles = {}, onChange, onClose, prio = DEFAULT_PRIO, onPrio }) {
  const [tags, setTags] = useState([]);
  useEffect(() => { if (nbId) loadIndex(year, nbId).then((idx) => setTags(Object.keys(idx.tags))); }, [nbId, year]);
  const all = [...new Set([...tags.map(tagKey), ...Object.keys(styles)])].sort();
  const [open, setOpen] = useState(null);
  const set = (t, p) => onChange({ ...styles, [t]: { ...(styles[t] || DEFAULT_TAG), ...p } });
  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <section className="sheet" aria-label="Tags">
        <div className="grab" />
        <div className="ptitle hand">Tags</div>
        <div className="ptitle small" style={{ marginTop: 6 }}>PRIORITY HIGHLIGHTS</div>
        <p className="hint" style={{ margin: '2px 0 8px' }}>Tap a to-do, then ! to cycle its priority. Pick the highlighter color for each level.</p>
        <div className="prioset">
          {['Low', 'Medium', 'High'].map((l, i) => (
            <label key={l} className="prioone" style={{ '--hl': prio[i] }}>
              <span className="priodot"><input type="color" value={prio[i]} onChange={(e) => onPrio(prio.map((c, j) => (j === i ? e.target.value : c)))} aria-label={l + ' priority color'} /></span>
              <span className="priosample">{'!'.repeat(i + 1)} {l}</span>
            </label>
          ))}
        </div>
        <div className="ptitle small" style={{ marginTop: 14 }}>TAG LOOKS</div>
        <p className="hint">Pick a look for a tag and it shows that way everywhere you use it. Add tags by typing #something in a to-do.</p>
        {!all.length && <p className="hint">No tags yet.</p>}
        {all.map((t) => {
          const l = styles[t] || DEFAULT_TAG;
          return (
            <div key={t} className="tagrow">
              <button className="tagpill" style={{ background: l.bg, borderColor: l.border, color: l.text }} onClick={() => setOpen(open === t ? null : t)}>{t}</button>
              <button className="mini" onClick={() => setOpen(open === t ? null : t)}>{open === t ? 'Close' : 'Style'}</button>
              {open === t && (
                <div className="tagedit">
                  <div className="taglooks">
                    {TAG_LOOKS.map((k, i) => <button key={i} className="tagpill" style={{ background: k.bg, borderColor: k.border, color: k.text }} onClick={() => set(t, k)}>Aa</button>)}
                  </div>
                  <div className="tagcolors">
                    {[['bg', 'Background'], ['border', 'Border'], ['text', 'Text']].map(([k, label]) => (
                      <label key={k}><input type="color" value={l[k]} onChange={(e) => set(t, { [k]: e.target.value })} />{label}</label>
                    ))}
                    <button className="mini" onClick={() => { const n = { ...styles }; delete n[t]; onChange(n); }}>Reset</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <button className="btn primary" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>Done</button>
      </section>
    </>
  );
}


// Every #tag you've used, for suggestions while typing.
export const AllTagsCtx = createContext([]);
// A text box that suggests your existing tags as soon as you type '#'. Tap one (or press Enter/Tab) to fill it in.
export function TagInput({ value, onChange, onKeyDown, onBlur, up, ...rest }) {
  const all = useContext(AllTagsCtx);
  const ref = useRef(null);
  const [caret, setCaret] = useState(value.length);
  const [focus, setFocus] = useState(false);
  const m = value.slice(0, caret).match(/#([\w-]*)$/);
  const list = m && focus ? all.filter((t) => t.slice(1).toLowerCase().startsWith(m[1].toLowerCase()) && t.toLowerCase() !== '#' + m[1].toLowerCase()).slice(0, 6) : [];
  const sync = (e) => setCaret(e.target.selectionStart ?? e.target.value.length);
  const pick = (tag) => {
    const start = caret - m[0].length, rest2 = value.slice(caret).replace(/^[\w-]*/, '').replace(/^\s*/, '');
    const nv = value.slice(0, start) + tag + ' ' + rest2, pos = start + tag.length + 1;
    onChange({ target: { value: nv } });
    requestAnimationFrame(() => { const el = ref.current; if (el) { el.focus(); el.setSelectionRange(pos, pos); setCaret(pos); } });
  };
  return (
    <span className="taginput">
      <input ref={ref} value={value} {...rest}
        onChange={(e) => { onChange(e); sync(e); }} onKeyUp={sync} onClick={sync} onSelect={sync}
        onFocus={(e) => { setFocus(true); sync(e); }}
        onBlur={(e) => { setFocus(false); onBlur && onBlur(e); }}
        onKeyDown={(e) => { if (list.length && (e.key === 'Enter' || e.key === 'Tab')) { e.preventDefault(); pick(list[0]); return; } onKeyDown && onKeyDown(e); }} />
      {list.length > 0 && (
        <span className={'tagsug' + (up ? ' up' : '')} role="listbox">
          {list.map((t) => <button key={t} type="button" role="option" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(t)}><TagPill tag={t} /></button>)}
        </span>
      )}
    </span>
  );
}

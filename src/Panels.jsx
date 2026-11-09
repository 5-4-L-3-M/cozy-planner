import { TagPill } from './tags';
import { useEffect, useState } from 'react';
import { MONTHS, SHORT, addDays, isoWeek, monthWeeks, parse, today, weekRange, weekStart } from './dates';
import { loadIndex, searchTasks } from './store';
import Icon from './Icon';

export function MonthSheet({ ws, go, onClose }) {
  const d0 = parse(addDays(ws, 3));
  const [ym, setYm] = useState([d0.getFullYear(), d0.getMonth()]);
  const [y, m] = ym;
  const shift = (n) => { const d = new Date(y, m + n, 1); setYm([d.getFullYear(), d.getMonth()]); };
  const t0 = today();
  const pick = (w) => { go(w); onClose(); };
  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <section className="sheet" aria-label="Jump to a week">
        <div className="grab" />
        <div className="prow">
          <button className="circ" aria-label="Previous month" onClick={() => shift(-1)}><Icon n="chevl" s={18} /></button>
          <span className="hand" style={{ fontSize: 28, flex: 1, textAlign: 'center' }}>{MONTHS[m]}</span>
          <select value={y} onChange={(e) => setYm([+e.target.value, m])} aria-label="Year">
            {Array.from({ length: 7 }, (_, i) => d0.getFullYear() - 3 + i).map((yy) => <option key={yy}>{yy}</option>)}
          </select>
          <button className="circ" aria-label="Next month" onClick={() => shift(1)}><Icon n="chevr" s={18} /></button>
        </div>
        <div className="mchips">
          {SHORT.map((s, i) => <button key={s} className={i === m ? 'on' : ''} onClick={() => setYm([y, i])}>{s}</button>)}
        </div>
        <div className="mgrid head"><span>WK</span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
        {monthWeeks(y, m).map((w) => (
          <div key={w} className={'mgrid row' + (w === ws ? ' cur' : '')}>
            <button className="wkn" onClick={() => pick(w)}>{isoWeek(w)}</button>
            {Array.from({ length: 7 }, (_, i) => {
              const day = addDays(w, i); const dd = parse(day);
              return (
                <button key={day} className={'md' + (dd.getMonth() !== m ? ' out' : '') + (day === t0 ? ' today' : '')} onClick={() => pick(w)}>
                  {dd.getDate()}
                </button>
              );
            })}
          </div>
        ))}
        <div className="prow" style={{ marginTop: 14 }}>
          <button className="btn rose" style={{ flex: 1 }} onClick={() => pick(weekStart(t0))}>Back to today</button>
        </div>
      </section>
    </>
  );
}

// A left-menu section that folds up; remembers open/closed on this device.
export function Fold({ id, label, extra, children, className = '' }) {
  const key = 'fold-' + id;
  const [open, setOpen] = useState(() => { try { return localStorage.getItem(key) !== '0'; } catch { return true; } });
  const toggle = () => setOpen((v) => { try { localStorage.setItem(key, v ? '0' : '1'); } catch { /* fine */ } return !v; });
  return (
    <div className={'isec fold ' + className + (open ? ' open' : '')}>
      <div className="foldhead">
        <button className="foldbtn" onClick={toggle} aria-expanded={open}><span className="chev">›</span>{label}</button>
        {extra}
      </div>
      {open && children}
    </div>
  );
}

export function IndexPanel({ ws, go, query, setQuery, onDone, onSignOut, onHelp, onReminders, onTags, extra, nbId, refSection, noWeeks, onTag }) {
  const year = parse(addDays(ws, 3)).getFullYear();
  const [idx, setIdx] = useState({ weeks: new Set(), tags: {}, extras: {} });
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(parse(addDays(ws, 3)).getMonth());
  const [allTags, setAllTags] = useState(false);

  useEffect(() => { if (nbId) loadIndex(year, nbId).then(setIdx); }, [year, ws, nbId]);
  useEffect(() => { setOpen(parse(addDays(ws, 3)).getMonth()); }, [ws]);
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults(null); return; }
    const t = setTimeout(() => searchTasks(q, nbId).then(setResults), 250);
    return () => clearTimeout(t);
  }, [query]);

  const jump = (w) => { go(w); onDone && onDone(); };
  const tags = Object.entries(idx.tags).sort((a, b) => b[1] - a[1]);

  return (
    <div className="index">
      <label className="search">
        <Icon n="search" s={18} />
        <input placeholder="Search tasks and #tags" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search" />
        {query && <button className="ib" aria-label="Clear search" onClick={() => setQuery('')}><Icon n="x" s={14} /></button>}
      </label>

      {!results && refSection}
      {results ? (
        <div className="results">
          {!results.length && <p className="hint">Nothing found.</p>}
          {results.map((r) => (
            <button key={r.id} className={'res' + (r.done ? ' done' : '')} onClick={() => jump(weekStart(r.day))}>
              <span className="rd">{SHORT[parse(r.day).getMonth()]} {parse(r.day).getDate()}</span>
              <span className="rt">{r.text}</span>
            </button>
          ))}
        </div>
      ) : noWeeks ? null : (
        <>
          {tags.length > 0 && (
            <Fold id="tags" label="TAGS" extra={onTags && <button className="mini" onClick={onTags}>Looks &amp; priority</button>}>
              <div className="tags">{(allTags ? tags : tags.slice(0, 6)).map(([t, n]) => <TagPill key={t} tag={t} count={n} onClick={() => (onTag ? onTag(t) : setQuery(t))} />)}
                {tags.length > 6 && <button className="mini" onClick={() => setAllTags((v) => !v)}>{allTags ? 'Less' : `+${tags.length - 6} more`}</button>}</div>
            </Fold>
          )}
          <Fold id="index" label={`INDEX · ${year}`}>
            {MONTHS.map((name, mi) => (
              <div key={name}>
                <button className={'imonth' + (open === mi ? ' open' : '')} onClick={() => setOpen(open === mi ? -1 : mi)}>{name}</button>
                {open === mi && monthWeeks(year, mi).map((w) => (
                  <button key={w} className={'iweek' + (w === ws ? ' cur' : '')} onClick={() => jump(w)}>
                    <span>Week {isoWeek(w)} · {weekRange(w)}</span>
                    {idx.weeks.has(w) && <i className="dot" />}
                    {idx.extras[w] && <small>{idx.extras[w].join(' · ')}</small>}
                  </button>
                ))}
              </div>
            ))}
          </Fold>
        </>
      )}
      {extra}
      <div className="isec ifoot">
        {onReminders && <button className="mini" onClick={onReminders}>🔔 Reminders</button>}
        {onHelp && <button className="mini" onClick={onHelp}>? Help &amp; what’s new</button>}
        {onSignOut && <button className="mini" onClick={onSignOut}><Icon n="logout" s={14} /> Sign out</button>}
      </div>
    </div>
  );
}

import { TagPill, PrioCtx, TagInput } from './tags';
import { useContext } from 'react';
import { useEffect, useRef, useState } from 'react';
import { addDays, parse, DAYS, today, isoWeek, weekLabel } from './dates';
import Icon from './Icon';
import { RemCtx, remindAt, timeLabel, todoistSend, todoistDone, todoistDelete } from './Reminders';
import { useHeaders, ArtInline, monthKey } from './headers';

export default function WeekPage({ ws, tasks, api, onTag, showHead, deco, onDeco, renderDecor, dayH, onDayH, onTops }) {
  const t0 = today();
  // Decorate mode: drag the line under a day to give that day more room. Double-tap the line to reset it.
  const [liveH, setLiveH] = useState(null);
  const raw = liveH || dayH || {};
  // Page limit: the week can grow a little past one page (up to ~25% taller), but not run away.
  // Extra room is shrunk to fit if this screen's text takes more space than where it was set.
  const [room, setRoom] = useState(Infinity);
  const [tops, setTops] = useState(null);
  useEffect(() => { if (tops) onTops?.(tops); }, [tops]);
  const sumOf = (o) => Object.values(o).reduce((a, b) => a + (b || 0), 0);
  const total = sumOf(raw), k = total > room ? Math.max(0, room) / total : 1;
  const hs = Object.fromEntries(Object.entries(raw).map(([i, v]) => [i, Math.floor(v * k)]));
  const applied = useRef(0); applied.current = sumOf(hs);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const measure = () => {
      const days = el.querySelectorAll(':scope > .day'), last = days[days.length - 1];
      if (!last || !el.offsetWidth) return;
      const content = last.offsetTop + last.offsetHeight + 16;
      // Where each day starts, in drawing units (page width = 1000), so decorations can follow their day.
      const k = 1000 / el.offsetWidth, t = [...days].map((d) => Math.round(d.offsetTop * k));
      setTops((o) => (o && o.length === t.length && o.every((v, i) => Math.abs(v - t[i]) < 2) ? o : t));
      const r = Math.max(Math.round(el.offsetWidth * 0.6), Math.round(el.offsetWidth * 1.3 * 1.25 - (content - applied.current)));
      setRoom((o) => (Math.abs(o - r) > 2 ? r : o));
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  });
  const dragLine = (e, i) => {
    e.preventDefault(); e.stopPropagation();
    const y0 = e.clientY, base = hs[i] || 0, start = { ...hs };
    const cap = base + Math.max(0, room - sumOf(hs));
    const sc = box.current ? box.current.getBoundingClientRect().height / box.current.offsetHeight || 1 : 1;
    let cur = start;
    const mv = (ev) => { cur = { ...start, [i]: Math.max(0, Math.min(cap, Math.round(base + (ev.clientY - y0) / sc))) }; setLiveH(cur); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); if (cur !== start) onDayH?.(cur); setTimeout(() => setLiveH(null), 400); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  };
  const resetLine = (i) => { const n = { ...hs }; delete n[i]; onDayH?.(n); };
  // The decoration layer covers the whole page; its drawing height follows the page's shape.
  const box = useRef(null);
  const [ratio, setRatio] = useState(0);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => { const r = el.getBoundingClientRect(); if (r.width) setRatio(r.height / r.width); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className={'weekpage' + (deco ? ' decorating' : '')} ref={box}>
      {onDeco && <button className={'decobtn' + (deco ? ' on' : '')} onClick={onDeco} title={deco ? 'Done decorating' : 'Draw and add stickers on this page'}>{deco ? '✓ Done' : '✎ Decorate'}</button>}
      {renderDecor && ratio > 0 && <div className={'wkdecor' + (deco ? ' on' : '')}>{renderDecor(Math.round((1000 * ratio) / 20) * 20)}</div>}
      {showHead && (
        <div className="wp-head">
          <WeekTitle ws={ws} />
          <span className="wk">WEEK {isoWeek(ws)} · {parse(ws).getDate()} → {parse(addDays(ws, 6)).getDate()}</span>
        </div>
      )}
      {DAYS.map((name, i) => {
        const day = addDays(ws, i);
        const list = tasks.filter((t) => t.day === day).sort((a, b) => a.position - b.position);
        return <Day key={day} day={day} name={name} i={i} list={list} api={api} isToday={day === t0} onTag={onTag} extra={hs[i] || 0} line={deco && onDayH ? { down: (e) => dragLine(e, i), reset: () => resetLine(i) } : null} />;
      })}
    </div>
  );
}

// Month + year in your own hand when you've drawn them (falls back to the typed label).
function WeekTitle({ ws }) {
  const hdr = useHeaders();
  const d = parse(addDays(ws, 3)), mk = monthKey(d.getFullYear(), d.getMonth()), yk = `y-${d.getFullYear()}`;
  if (!hdr[mk] && !hdr[yk]) return <span className="hand" style={{ fontSize: 30 }}>{weekLabel(ws)}</span>;
  return (
    <span className="hand wtitle" style={{ fontSize: 30 }}>
      {hdr[mk] ? <ArtInline art={hdr[mk]} height={40} /> : weekLabel(ws).replace(/\s*\d{4}$/, '')}
      {' '}
      {hdr[yk] ? <ArtInline art={hdr[yk]} height={26} /> : d.getFullYear()}
    </span>
  );
}

// Dragging a to-do by its grip: shows where it will land, drops it on any day (even another column).
let dragState = null;
function startDrag(e, t, api) {
  e.preventDefault(); e.stopPropagation();
  const row = e.currentTarget.closest('.task');
  const ghost = row.cloneNode(true); ghost.classList.add('dragghost');
  const r = row.getBoundingClientRect();
  Object.assign(ghost.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', pointerEvents: 'none', zIndex: 60 });
  document.body.appendChild(ghost); row.classList.add('dragging');
  const line = document.createElement('div'); line.className = 'dropline'; document.body.appendChild(line);
  dragState = { t, dy: e.clientY - r.top, target: null };
  const find = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest('.day[data-day]'); if (!el) return null;
    // A subtask can be reordered among its siblings, or dropped elsewhere to become its own to-do.
    const rows = [...el.querySelectorAll(t.parent_id ? '.task.top:not(.dragging), .task.sub:not(.dragging)' : '.task.top:not(.dragging)')];
    let before = null;
    for (const rw of rows) { const b = rw.getBoundingClientRect(); if (y < b.top + b.height / 2) { before = rw; break; } }
    return { day: el.dataset.day, el, before, rows };
  };
  const mv = (ev) => {
    ghost.style.top = ev.clientY - dragState.dy + 'px';
    const tg = find(ev.clientX, ev.clientY); dragState.target = tg;
    if (!tg) { line.style.display = 'none'; return; }
    const ref = tg.before || tg.rows[tg.rows.length - 1], box = (ref || tg.el.querySelector('.dtasks')).getBoundingClientRect();
    Object.assign(line.style, { display: 'block', left: box.left + 'px', width: box.width + 'px', top: (tg.before ? box.top : ref ? box.bottom : box.top) - 2 + 'px' });
  };
  const up = () => {
    removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
    ghost.remove(); line.remove(); row.classList.remove('dragging');
    const tg = dragState?.target; dragState = null;
    if (!tg) return;
    const pos = (rw) => +rw.dataset.pos;
    let rows = tg.rows, i = tg.before ? rows.indexOf(tg.before) : rows.length;
    let parent = null;
    if (t.parent_id) {
      const sib = (rw) => rw && rw.classList.contains('sub') && rw.dataset.parent === t.parent_id;
      if (sib(rows[i - 1]) || sib(rows[i])) parent = t.parent_id;
      const keep = parent ? rows.filter(sib) : rows.filter((rw) => rw.classList.contains('top'));
      const anchor = rows[i] || null;
      i = anchor && keep.includes(anchor) ? keep.indexOf(anchor) : keep.filter((rw) => rows.indexOf(rw) < (anchor ? rows.indexOf(anchor) : rows.length)).length;
      rows = keep;
    }
    const prev = rows[i - 1], next = rows[i];
    const position = prev && next ? (pos(prev) + pos(next)) / 2 : prev ? pos(prev) + 1000 : next ? pos(next) - 1000 : Date.now();
    if (t.parent_id && !parent) api.updateTask(t.id, { parent_id: null });
    api.moveTask(t, tg.day, position);
  };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}

function Day({ day, name, i, list, api, isToday, onTag, extra, line }) {
  const hdr = useHeaders();
  const [draft, setDraft] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const v = draft.trim();
    if (v) { api.addTask(day, v); setDraft(''); }
  };
  const cls = i === 5 ? ' sat' : i === 6 ? ' sun' : '';
  return (
    <section className={'day' + (isToday ? ' today' : '') + cls} data-day={day} style={extra ? { paddingBottom: 8 + extra } : undefined}>
      {line && <span className="dayline" onPointerDown={line.down} onDoubleClick={line.reset} title="Drag to give this day more room · double-tap to reset"><i /></span>}
      <div className="dnum">
        <span className={'n hand' + (isToday ? ' ring' : '')}>{parse(day).getDate()}</span>
        <span className="dw">{hdr[`wd-${i}`] ? <ArtInline art={hdr[`wd-${i}`]} height={18} /> : name}</span>
      </div>
      <div className="dtasks">
        {list.filter((t) => !t.parent_id || !list.some((x) => x.id === t.parent_id)).map((t) => (
          <Task key={t.id} t={t} api={api} onTag={onTag} subs={list.filter((x) => x.parent_id === t.id)} />
        ))}
        <form onSubmit={submit}>
          <TagInput className="addinline" value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="+ add" aria-label={`Add task for ${name}`} />
        </form>
      </div>
    </section>
  );
}

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function RepeatSheet({ t, api, onClose }) {
  const w0 = (parse(t.day).getDay() + 6) % 7;
  const [days, setDays] = useState([w0]);
  const pick = (f) => { api.setRepeat(t, f === 'none' ? null : { freq: f, ...(f === 'weekly' ? { days: days.length ? days : [w0] } : {}) }); onClose(); };
  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <section className="sheet" aria-label="Repeat this to-do">
        <div className="grab" />
        <div className="ptitle hand">Repeat</div>
        <p className="hint" style={{ marginBottom: 10 }}>“{t.text}” — starting {WD[w0]} {parse(t.day).getDate()}. Each day gets its own checkbox.</p>
        <div className="repeatopts">
          <button className="btn" onClick={() => pick('daily')}>Every day</button>
          <button className="btn" onClick={() => pick('weekdays')}>Weekdays</button>
          <button className="btn" onClick={() => pick('monthly')}>Monthly on the {parse(t.day).getDate()}</button>
        </div>
        <div className="ptitle small" style={{ marginTop: 14 }}>WEEKLY ON</div>
        <div className="wdpick">
          {WD.map((d, i) => <button key={d} className={days.includes(i) ? 'on' : ''} onClick={() => setDays((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))}>{d[0]}</button>)}
          <button className="btn primary" onClick={() => pick('weekly')} disabled={!days.length}>Repeat weekly</button>
        </div>
        {t.recur_id && <button className="mini danger" style={{ marginTop: 14 }} onClick={() => pick('none')}>Stop repeating (keeps past ones)</button>}
      </section>
    </>
  );
}

function Task({ t, api, onTag, subs, isSub }) {
  const [adding, setAdding] = useState(false);
  const [sv, setSv] = useState('');
  const doneSubs = (subs || []).filter((x) => x.done).length;
  const prio = useContext(PrioCtx);
  const p = t.priority || 0;
  const [edit, setEdit] = useState(false);
  const [rep, setRep] = useState(false);
  const [v, setV] = useState(t.text);
  const [ask, setAsk] = useState(null); // repeating to-do: { kind: 'edit' | 'delete', text }
  const [clock, setClock] = useState(false);
  const rem = useContext(RemCtx), tok = rem.settings.todoist?.token;
  const del = () => { setEdit(false); if (t.todoist_id && tok) todoistDelete(tok, t.todoist_id); if (t.recur_id) setAsk({ kind: 'delete' }); else api.removeTask(t.id); };
  const save = () => {
    setEdit(false);
    const x = v.trim();
    if (!x) del();
    else if (x !== t.text) { if (t.recur_id) setAsk({ kind: 'edit', text: x }); else api.updateTask(t.id, { text: x }); }
  };
  return (
    <>
    <div className={'task' + (t.done ? ' done' : '') + (isSub ? ' sub' : ' top')} data-pos={t.position} data-parent={t.parent_id || undefined}>
      <span className="tgrip" onPointerDown={(e) => startDrag(e, t, api)} aria-label="Drag to move" title="Drag to move">⋮⋮</span>
      <input type="checkbox" checked={t.done} onChange={() => { api.updateTask(t.id, { done: !t.done }); if (t.todoist_id && tok) todoistDone(tok, t.todoist_id, !t.done); }} aria-label="Done" />
      {edit ? (
        <>
          <TagInput className="tedit" autoFocus value={v} onChange={(e) => setV(e.target.value)} onBlur={save}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setV(t.text); setEdit(false); } }} />
          <button className={'ib prio' + (p ? ' on' : '')} title="Priority (tap to cycle)" aria-label="Change priority" onMouseDown={(e) => e.preventDefault()}
            onClick={() => api.updateTask(t.id, { priority: (p + 1) % 4 })} style={p ? { '--hl': prio[p - 1] } : undefined}>{'!'.repeat(Math.max(1, p))}</button>
          {!isSub && <button className="ib" title="Add a subtask" aria-label="Add a subtask" onMouseDown={(e) => e.preventDefault()} onClick={() => { save(); setAdding(true); }}>↳</button>}
          <button className={'ib' + (t.time ? ' on' : '')} title="Time & reminder" aria-label="Time and reminder" onMouseDown={(e) => e.preventDefault()}
            onClick={() => { save(); setClock(true); }}><Icon n="clock" s={16} /></button>
          <button className={'ib' + (t.recur_id ? ' on' : '')} title="Repeat" aria-label="Repeat this to-do" onMouseDown={(e) => e.preventDefault()}
            onClick={() => { save(); setRep(true); }}><Icon n="repeat" s={16} /></button>
          <button className="ib" title="Delete task" onMouseDown={(e) => e.preventDefault()}
            onClick={del}><Icon n="trash" s={16} /></button>
        </>
      ) : (
        <span className={'ttext' + (p ? ' hl' : '')} style={p ? { '--hl': prio[p - 1] } : undefined} onClick={() => { setV(t.text); setEdit(true); }}>{(() => { const m = t.time ? t.text.match(/(\s+#[\w-]+)+\s*$/) : null; const head = m ? t.text.slice(0, m.index) : t.text, tail = m ? m[0] : ''; return <>{withTags(head, onTag)}{t.time && <span className={'ttime' + (t.remind_at ? ' bell' : '')}>{timeLabel(t.time)}</span>}{tail && withTags(tail, onTag)}</>; })()}{t.recur_id && <span className="recur" title="Repeats" aria-label="Repeats"><Icon n="repeat" s={12} /></span>}{subs?.length > 0 && <span className="subcount">{doneSubs}/{subs.length}</span>}</span>
      )}
      {rep && <RepeatSheet t={t} api={api} onClose={() => setRep(false)} />}
      {clock && <TimeSheet t={t} api={api} rem={rem} onClose={() => setClock(false)} />}
      {ask && (
        <div className="recask" role="dialog" aria-label={ask.kind === 'edit' ? 'Change which ones?' : 'Delete which ones?'}>
          <span>{ask.kind === 'edit' ? 'Change' : 'Delete'}:</span>
          <button className="mini" onClick={() => { setAsk(null); ask.kind === 'edit' ? api.editRecurring(t, ask.text, 'one') : api.removeRecurring(t, 'one'); }}>Just this one</button>
          {ask.kind === 'delete' && <button className="mini" onClick={() => { setAsk(null); api.removeRecurring(t, 'future'); }}>This &amp; later</button>}
          <button className="mini" onClick={() => { setAsk(null); ask.kind === 'edit' ? api.editRecurring(t, ask.text, 'all') : api.removeRecurring(t, 'all'); }}>All of them</button>
          <button className="mini ghost" onClick={() => { setAsk(null); setV(t.text); }}>Cancel</button>
        </div>
      )}
      {!t.done && !edit && !isSub && (
        <button className="ib" title="Move to tomorrow" aria-label="Move to tomorrow" onClick={() => api.rollover(t)}>
          <Icon n="arrow" s={16} />
        </button>
      )}
    </div>
    {(subs || []).sort((a, b) => a.position - b.position).map((st) => <Task key={st.id} t={st} api={api} onTag={onTag} isSub />)}
    {adding && (
      <form className="task sub" onSubmit={(e) => { e.preventDefault(); const x = sv.trim(); if (x) api.addTask(t.day, x, { parent_id: t.id, priority: t.priority || 0 }); setSv(''); }}>
        <TagInput className="tedit" autoFocus value={sv} placeholder="a smaller step…" onChange={(e) => setSv(e.target.value)}
          onBlur={() => { const x = sv.trim(); if (x) api.addTask(t.day, x, { parent_id: t.id, priority: t.priority || 0 }); setSv(''); setAdding(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setSv(''); setAdding(false); } }} />
      </form>
    )}
    </>
  );
}

// Words get the priority highlight; tag pills sit outside it so they stay clean.
function withTags(text, onTag) {
  return text.split(/(#[\w-]+)/g).map((part, i) =>
    part.startsWith('#')
      ? <TagPill key={i} tag={part} onClick={(e) => { e.stopPropagation(); onTag(part); }} />
      : part.trim() ? <span key={i} className="hltx">{part}</span> : part);
}

// Time + reminder + Todoist for one to-do.
function TimeSheet({ t, api, rem, onClose }) {
  const tok = rem.settings.todoist?.token;
  const [time, setTime] = useState(t.time || '09:00');
  const [ping, setPing] = useState(t.time ? !!t.remind_at : true);
  const [td, setTd] = useState(!!t.todoist_id || (!!tok && !!rem.settings.todoist?.auto));
  const [msg, setMsg] = useState('');
  const save = async () => {
    const patch = { time, remind_at: ping ? remindAt(t.day, time, rem.settings.remindBefore || 0) : null, notified_at: null };
    api.updateTask(t.id, patch);
    if (td && tok) {
      try { const id = await todoistSend(tok, { ...t, ...patch }); if (id !== t.todoist_id) api.updateTask(t.id, { todoist_id: String(id) }); }
      catch (e) { setMsg(e.message); return; }
    }
    onClose();
  };
  const clear = () => { api.updateTask(t.id, { time: null, remind_at: null, notified_at: null }); onClose(); };
  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <section className="sheet" aria-label="Time and reminder">
        <div className="grab" />
        <div className="ptitle hand">When?</div>
        <input type="time" className="timein" value={time} onChange={(e) => setTime(e.target.value)} />
        <label className="toggle" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={ping} onChange={(e) => setPing(e.target.checked)} />
          <span>Remind me {rem.settings.remindBefore ? `${rem.settings.remindBefore} min before` : 'at that time'} <small>(turn on in left menu → 🔔 Reminders)</small></span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={td} disabled={!tok} onChange={(e) => setTd(e.target.checked)} />
          <span>{t.todoist_id ? 'In Todoist (update it)' : 'Send to Todoist'} {!tok && <small>(connect it in 🔔 Reminders first)</small>}</span>
        </label>
        {msg && <p className="hint">{msg}</p>}
        <div className="prow" style={{ marginTop: 12 }}>
          {t.time && <button className="mini danger" onClick={clear}>Remove time</button>}
          <button className="mini" style={{ marginLeft: 'auto' }} onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save</button>
        </div>
      </section>
    </>
  );
}

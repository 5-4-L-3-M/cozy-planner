import { useEffect, useState } from 'react';
import { sb } from './supabase';
import { SHORT, isoWeek, parse, today, weekRange, weekStart } from './dates';
import { TagPill } from './tags';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hasTag = (text, tag) => new RegExp(`(^|[^\\w-])${tag.replace(/[-]/g, '\\-')}(?![\\w-])`, 'i').test(text || '');
// Typed text anywhere inside a reference page's saved content (contacts, lists, links…).
const textOf = (v) => (v == null ? '' : typeof v === 'string' ? v : Array.isArray(v) ? v.map(textOf).join(' ') : typeof v === 'object' ? Object.values(v).map(textOf).join(' ') : String(v));

// Everything carrying one #tag: to-dos by date, typed notes grouped by week or by page.
export default function TagPage({ tag, nbId, onClose, onWeek, onPage, spread }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let live = true;
    setData(null);
    (async () => {
      const [t, p] = await Promise.all([
        sb.from('tasks').select('id,day,text,done,priority,parent_id').eq('notebook_id', nbId).ilike('text', `%${tag}%`).order('day').limit(1000),
        sb.from('pages').select('id,name,section,kind,week_start,ref_type,content').eq('notebook_id', nbId),
      ]);
      const pages = p.data || [];
      const ids = pages.map((x) => x.id);
      const it = ids.length ? await sb.from('items').select('id,page_id,kind,data').in('page_id', ids).in('kind', ['text', 'sticky']).ilike('data->>text', `%${tag}%`) : { data: [] };
      if (!live) return;
      const byId = Object.fromEntries(pages.map((x) => [x.id, x]));
      const notes = (it.data || []).filter((x) => hasTag(x.data?.text, tag)).map((x) => ({ page: byId[x.page_id], text: x.data.text, id: x.id }));
      for (const pg of pages) if (pg.ref_type && pg.ref_type !== 'freeform' && hasTag(textOf(pg.content), tag)) notes.push({ page: pg, text: snippet(textOf(pg.content), tag), id: 'pg-' + pg.id });
      setData({ tasks: (t.data || []).filter((x) => hasTag(x.text, tag)), notes });
    })();
    return () => { live = false; };
  }, [tag, nbId]);

  const t0 = today();
  const tasks = data?.tasks || [];
  const soon = tasks.filter((x) => x.day >= t0), past = tasks.filter((x) => x.day < t0).reverse();
  const weekly = {}, other = {};
  for (const n of data?.notes || []) {
    if (!n.page) continue;
    if (n.page.section === 'week' && n.page.week_start) (weekly[n.page.week_start] ||= []).push(n);
    else (other[n.page.id] ||= []).push(n);
  }
  const weeks = Object.keys(weekly).sort().reverse();
  const where = (pg) => (pg.section === 'reference' ? 'Reference card' : pg.section === 'monthcover' ? 'Month cover' : 'Page');

  const dayGroups = (list) => {
    const g = [];
    for (const x of list) { const last = g[g.length - 1]; if (last && last.day === x.day) last.items.push(x); else g.push({ day: x.day, items: [x] }); }
    return g.map(({ day, items }) => {
      const d = parse(day);
      return (
        <button key={day} className="tgday" onClick={() => onWeek(weekStart(day))}>
          <span className="tgdate"><b>{d.getDate()}</b><small>{DAYS[d.getDay()]} · {SHORT[d.getMonth()]}</small></span>
          <span className="tgtasks">{items.map((x) => (
            <span key={x.id} className={'tgtask' + (x.done ? ' done' : '') + (x.parent_id ? ' sub' : '')}><i className={'tgbox' + (x.done ? ' on' : '')} />{x.text}</span>
          ))}</span>
        </button>
      );
    });
  };

  const tasksPage = (
    <section className="tgpage">
      <header className="tghead"><TagPill tag={tag} /><button className="tgx" onClick={onClose} aria-label="Close tag page">×</button></header>
      <div className="tgtitle hand">To-dos</div>
      {!data && <p className="hint">Gathering…</p>}
      {data && !tasks.length && <p className="hint">No to-dos with {tag} yet.</p>}
      {soon.length > 0 && <><div className="tglbl">COMING UP</div>{dayGroups(soon)}</>}
      {past.length > 0 && <><div className="tglbl">EARLIER</div>{dayGroups(past)}</>}
    </section>
  );
  const notesPage = (
    <section className="tgpage">
      <div className="tgtitle hand">Notes</div>
      {data && !weeks.length && !Object.keys(other).length && <p className="hint">No typed notes with {tag} yet.</p>}
      {weeks.length > 0 && <div className="tglbl">WEEKLY NOTES</div>}
      {weeks.map((w) => (
        <div key={w} className="tgweek">
          <button className="tgwhead" onClick={() => onPage(weekly[w][0].page)}>Week {isoWeek(w)} <small>· {weekRange(w)}</small></button>
          {weekly[w].map((n) => <button key={n.id} className="tgnote" onClick={() => onPage(n.page)}>{n.page.kind === 'notes' ? '' : <small>{n.page.name} · </small>}{n.text}</button>)}
        </div>
      ))}
      {Object.keys(other).length > 0 && <div className="tglbl">ELSEWHERE</div>}
      <div className="tgcards">
        {Object.values(other).map((list) => (
          <button key={list[0].page.id} className="tgcard" onClick={() => onPage(list[0].page)}>
            <span className="tgcname">{list[0].page.name}<small>{where(list[0].page)}</small></span>
            {list.map((n) => <span key={n.id} className="tgsnip">{n.text}</span>)}
          </button>
        ))}
      </div>
      <p className="hint tgfoot">Handwriting can’t be searched yet — type {tag} in a text box or sticky note and it shows up here.</p>
    </section>
  );
  return spread ? <div className="tgspread">{tasksPage}{notesPage}</div> : <div className="tgone">{tasksPage}{notesPage}</div>;
}

function snippet(text, tag) {
  const i = text.toLowerCase().indexOf(tag.toLowerCase());
  const a = Math.max(0, i - 40), b = Math.min(text.length, i + tag.length + 60);
  return (a > 0 ? '…' : '') + text.slice(a, b).trim() + (b < text.length ? '…' : '');
}

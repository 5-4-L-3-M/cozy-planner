import { useCallback, useEffect, useRef, useState } from 'react';
import { sb } from './supabase';
import { addDays, weekStart, parse } from './dates';

const uid = () => crypto.randomUUID();
const logErr = (r) => r?.error && console.error(r.error);

export const DEFAULTS = {
  paperColor: '#f4ebdd',
  paperStyle: 'grid',
  palettes: [
    { name: 'Moody', colors: ['#3d3121', '#f2e8da', '#c95a55', '#cf826d', '#d4b48b', '#98a487', '#6f9fae', '#6e819c', '#7c6e8c'] },
    { name: 'Highlights', colors: ['#f2d16b', '#f5a3b5', '#9fd3c7', '#a7c4f2', '#c9b3f0'] },
  ],
  activePalette: 0,
  pen: { color: '#3d3121', size: 5, opacity: 1, sensitivity: 0.8, type: 'ballpoint' },
  highlighter: { color: '#f2d16b', size: 26, opacity: 0.45 },
  eraser: { mode: 'stroke', size: 18 },
  favorites: [],
};

const merge = (d = {}) => ({
  ...DEFAULTS, ...d,
  pen: { ...DEFAULTS.pen, ...d.pen },
  highlighter: { ...DEFAULTS.highlighter, ...d.highlighter },
  eraser: { ...DEFAULTS.eraser, ...d.eraser },
});

/* ---------- settings (synced) ---------- */
export function useSettings(user) {
  const [s, setS] = useState(DEFAULTS);
  const timer = useRef();
  const pending = useRef(false);

  useEffect(() => {
    sb.from('settings').select('data').maybeSingle().then(({ data }) => data && setS(merge(data.data)));
    const ch = sb.channel('settings-' + user.id + '-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (p) => {
        if (!pending.current && p.new?.data) setS(merge(p.new.data));
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [user.id]);

  const update = useCallback((patch) => {
    setS((prev) => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      pending.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        sb.from('settings')
          .upsert({ user_id: user.id, data: next, updated_at: new Date().toISOString() })
          .then((r) => { logErr(r); setTimeout(() => { pending.current = false; }, 800); });
      }, 400);
      return next;
    });
  }, [user.id]);

  return [s, update];
}

/* ---------- repeating to-dos ---------- */
// Rules live in "recurring"; each occurrence becomes a normal task (with recur_id) the first time its week
// or month is opened, so ticking one off only ticks that day. Deleted occurrences are remembered in rule.skip.
const wd = (day) => (parse(day).getDay() + 6) % 7; // Mon = 0
export function occurs(rule, day) {
  if (day < rule.start || (rule.until && day > rule.until) || (rule.skip || []).includes(day)) return false;
  if (rule.freq === 'daily') return true;
  if (rule.freq === 'weekdays') return wd(day) < 5;
  if (rule.freq === 'weekly') return (rule.days || [wd(rule.start)]).includes(wd(day));
  if (rule.freq === 'monthly') return parse(day).getDate() === parse(rule.start).getDate();
  return false;
}
export async function ensureRecurring(nbId, from, to) {
  const { data: rules } = await sb.from('recurring').select('*').eq('notebook_id', nbId);
  if (!rules?.length) return;
  const { data: have } = await sb.from('tasks').select('recur_id,day').eq('notebook_id', nbId).not('recur_id', 'is', null).gte('day', from).lte('day', to);
  const got = new Set((have || []).map((t) => t.recur_id + t.day));
  const rows = [];
  for (const r of rules) for (let d = from; d <= to; d = addDays(d, 1)) {
    if (occurs(r.rule, d) && !got.has(r.id + d)) rows.push({ id: uid(), day: d, text: r.text, done: false, position: Date.now() + rows.length, notebook_id: nbId, recur_id: r.id });
  }
  for (const row of rows) await sb.from('tasks').insert(row); // one at a time so a duplicate from another device doesn't block the rest
}

/* ---------- one week: tasks + pages ---------- */
export function useWeek(ws, user, nbId) {
  const [tasks, setTasks] = useState([]);
  const [pages, setPages] = useState([]);
  const end = addDays(ws, 6);
  const inWeek = (day) => day >= ws && day <= end;

  useEffect(() => {
    let live = true;
    setTasks([]); setPages([]);
    (async () => {
      if (!nbId) return;
      await ensureRecurring(nbId, ws, end).catch(() => {});
      const [t, p] = await Promise.all([
        sb.from('tasks').select('*').eq('notebook_id', nbId).gte('day', ws).lte('day', end),
        sb.from('pages').select('*').eq('notebook_id', nbId).or(`week_start.eq.${ws},pinned.eq.true,section.neq.week`),
      ]);
      let pg = p.data || [];
      if (!pg.some((x) => x.kind === 'notes' && x.week_start === ws)) {
        const ins = await sb.from('pages').insert({ week_start: ws, kind: 'notes', name: 'Notes', notebook_id: nbId }).select().single();
        if (ins.data) pg = [ins.data, ...pg];
        else pg = (await sb.from('pages').select('*').eq('notebook_id', nbId).or(`week_start.eq.${ws},pinned.eq.true,section.neq.week`)).data || pg;
      }
      if (live) { setTasks(t.data || []); setPages(pg); }
    })();

    const ch = sb.channel('week-' + ws + '-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (p) => {
        if (p.eventType === 'DELETE') return setTasks((s) => s.filter((x) => x.id !== p.old.id));
        const row = p.new;
        if (row.notebook_id !== nbId) return;
        setTasks((s) => {
          const rest = s.filter((x) => x.id !== row.id);
          return row.day >= ws && row.day <= end ? [...rest, row] : rest;
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, (p) => {
        if (p.eventType === 'DELETE') return setPages((s) => s.filter((x) => x.id !== p.old.id));
        const row = p.new;
        if (row.notebook_id !== nbId) return;
        setPages((s) => {
          const rest = s.filter((x) => x.id !== row.id);
          return row.week_start === ws || row.pinned || row.section !== 'week' ? [...rest, row] : rest;
        });
      })
      .subscribe();
    return () => { live = false; sb.removeChannel(ch); };
  }, [ws, user.id, nbId]);

  const api = {
    addTask(day, text, extra = {}) {
      const t = { id: uid(), day, text, done: false, position: Date.now(), notebook_id: nbId, ...extra };
      setTasks((s) => [...s, t]);
      sb.from('tasks').insert(t).then(logErr);
      return t.id;
    },
    // Drag-and-drop: put a to-do on a day at a position; its subtasks come along to the same day.
    moveTask(t, day, position) {
      api.updateTask(t.id, { day, position });
      tasks.filter((x) => x.parent_id === t.id && x.day !== day).forEach((x) => api.updateTask(x.id, { day }));
    },
    updateTask(id, patch) {
      const cur = tasks.find((x) => x.id === id);
      if (patch.day && cur?.remind_at && cur.day && patch.day !== cur.day && patch.remind_at === undefined) {
        patch = { ...patch, remind_at: new Date(new Date(cur.remind_at).getTime() + (parse(patch.day) - parse(cur.day))).toISOString(), notified_at: null };
      }
      setTasks((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)).filter((x) => inWeek(x.day)));
      sb.from('tasks').update(patch).eq('id', id).then(logErr);
    },
    removeTask(id) {
      const t = tasks.find((x) => x.id === id);
      if (t?.recur_id) sb.from('recurring').select('rule').eq('id', t.recur_id).single().then(({ data }) => {
        if (data) sb.from('recurring').update({ rule: { ...data.rule, skip: [...(data.rule.skip || []), t.day] } }).eq('id', t.recur_id).then(logErr);
      });
      setTasks((s) => s.filter((x) => x.id !== id));
      sb.from('tasks').delete().eq('id', id).then(logErr);
    },
    // Repeating to-dos: change the wording on just this day, or on every one (and on the ones still to come).
    async editRecurring(t, text, scope) {
      if (scope === 'one' || !t.recur_id) return api.updateTask(t.id, { text });
      setTasks((s) => s.map((x) => (x.recur_id === t.recur_id ? { ...x, text } : x)));
      await sb.from('recurring').update({ text }).eq('id', t.recur_id);
      await sb.from('tasks').update({ text }).eq('recur_id', t.recur_id);
    },
    // Delete a repeating to-do: 'one' skips this day, 'future' ends it here, 'all' removes every one of them.
    async removeRecurring(t, scope) {
      if (scope === 'one' || !t.recur_id) return api.removeTask(t.id);
      if (scope === 'future') {
        const { data } = await sb.from('recurring').select('rule').eq('id', t.recur_id).single();
        if (data) await sb.from('recurring').update({ rule: { ...data.rule, until: addDays(t.day, -1) } }).eq('id', t.recur_id);
        setTasks((s) => s.filter((x) => !(x.recur_id === t.recur_id && x.day >= t.day)));
        await sb.from('tasks').delete().eq('recur_id', t.recur_id).gte('day', t.day);
        return;
      }
      setTasks((s) => s.filter((x) => x.recur_id !== t.recur_id));
      await sb.from('tasks').delete().eq('recur_id', t.recur_id);
      await sb.from('recurring').delete().eq('id', t.recur_id);
    },
    // rule = { freq: 'daily' | 'weekdays' | 'weekly' | 'monthly', days?: [0-6] } or null to stop repeating.
    async setRepeat(t, rule) {
      if (!rule) {
        if (!t.recur_id) return;
        await sb.from('tasks').delete().eq('recur_id', t.recur_id).gt('day', t.day).eq('done', false);
        setTasks((s) => s.filter((x) => !(x.recur_id === t.recur_id && x.day > t.day && !x.done)).map((x) => (x.recur_id === t.recur_id ? { ...x, recur_id: null } : x)));
        await sb.from('recurring').delete().eq('id', t.recur_id);
        return;
      }
      if (t.recur_id) {
        await sb.from('recurring').update({ rule: { ...rule, start: t.day }, text: t.text }).eq('id', t.recur_id);
        await sb.from('tasks').delete().eq('recur_id', t.recur_id).gt('day', t.day).eq('done', false);
        setTasks((s) => s.filter((x) => !(x.recur_id === t.recur_id && x.day > t.day && !x.done)));
        await ensureRecurring(nbId, ws, end);
        return;
      }
      const rid = uid();
      await sb.from('recurring').insert({ id: rid, notebook_id: nbId, text: t.text, rule: { ...rule, start: t.day } });
      setTasks((s) => s.map((x) => (x.id === t.id ? { ...x, recur_id: rid } : x)));
      await sb.from('tasks').update({ recur_id: rid }).eq('id', t.id);
      await ensureRecurring(nbId, ws, end);
    },
    rollover(t) { api.moveTask(t, addDays(t.day, 1), Date.now()); },
    addPage(name, opts = {}) {
      const section = opts.section || 'week';
      const pg = { id: uid(), week_start: section === 'week' ? ws : null, kind: 'extra', name, position: Date.now(), notebook_id: nbId, section, ref_type: opts.ref_type || null, ref_group: opts.ref_group || null, content: opts.content || null };
      setPages((s) => [...s, { ...pg, color: null, pinned: false, paper: null, progress: { hidden: true } }]);
      sb.from('pages').insert(pg).then(logErr);
      return pg.id;
    },
    updatePage(id, patch) {
      setPages((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)).filter((x) => x.week_start === ws || x.pinned || x.section !== 'week'));
      sb.from('pages').update(patch).eq('id', id).then(logErr);
    },
    deletePage(id) {
      setPages((s) => s.filter((x) => x.id !== id));
      sb.from('pages').delete().eq('id', id).then(logErr);
    },
    setProgress(id, progress) {
      setPages((s) => s.map((x) => (x.id === id ? { ...x, progress } : x)));
      sb.from('pages').update({ progress }).eq('id', id).then(logErr);
    },
  };

  const byPos = (a, b) => a.position - b.position;
  const notes = pages.find((p) => p.kind === 'notes' && p.week_start === ws) || null;
  const extras = pages.filter((p) => p.kind === 'extra' && p.section === 'week' && !p.pinned && p.week_start === ws).sort(byPos);
  const pinned = pages.filter((p) => p.kind === 'extra' && p.section === 'week' && p.pinned).sort(byPos);
  const nbPages = pages.filter((p) => p.section === 'notebook').sort(byPos);
  const refPages = pages.filter((p) => p.section === 'reference').sort(byPos);
  return { tasks, notes, extras, pinned, nbPages, refPages, api };
}

/* ---------- strokes on one page ---------- */
const STROKE_KEYS = ['id', 'page_id', 'tool', 'color', 'size', 'opacity', 'thinning', 'style', 'stab', 'points'];
const clean = (s) => Object.fromEntries(STROKE_KEYS.map((k) => [k, s[k]]));

export function useStrokes(pageId) {
  const [strokes, setStrokes] = useState([]);

  useEffect(() => {
    setStrokes([]);
    if (!pageId) return;
    let live = true;
    sb.from('strokes').select('*').eq('page_id', pageId).order('created_at')
      .then(({ data }) => live && setStrokes(data || []));
    const ch = sb.channel('strokes-' + pageId + '-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'strokes', filter: `page_id=eq.${pageId}` },
        (p) => setStrokes((s) => (s.some((x) => x.id === p.new.id) ? s : [...s, p.new])))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'strokes', filter: `page_id=eq.${pageId}` },
        (p) => setStrokes((s) => s.map((x) => (x.id === p.new.id ? p.new : x))))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'strokes' },
        (p) => setStrokes((s) => s.filter((x) => x.id !== p.old.id)))
      .subscribe();
    return () => { live = false; sb.removeChannel(ch); };
  }, [pageId]);

  const add = useCallback((list, db = true) => {
    if (!list.length) return;
    setStrokes((s) => [...s, ...list]);
    if (db) sb.from('strokes').upsert(list.map(clean)).then(logErr);
  }, []);
  // Replace strokes in place (moved, resized, recolored).
  const put = useCallback((list) => {
    if (!list.length) return;
    const byId = new Map(list.map((x) => [x.id, x]));
    setStrokes((s) => {
      const seen = new Set();
      const out = s.map((x) => { if (byId.has(x.id)) { seen.add(x.id); return byId.get(x.id); } return x; });
      return [...out, ...list.filter((x) => !seen.has(x.id))];
    });
    sb.from('strokes').upsert(list.map(clean)).then(logErr);
  }, []);
  const remove = useCallback((ids, db = true) => {
    if (!ids.length) return;
    setStrokes((s) => s.filter((x) => !ids.includes(x.id)));
    if (db) sb.from('strokes').delete().in('id', ids).then(logErr);
  }, []);
  const persist = useCallback((added, removedIds) => {
    if (removedIds.length) sb.from('strokes').delete().in('id', removedIds).then(logErr);
    if (added.length) sb.from('strokes').upsert(added.map(clean)).then(logErr);
  }, []);

  return { strokes, add, remove, persist, put };
}

/* ---------- search + index ---------- */
export async function searchTasks(q, nbId) {
  const { data } = await sb.from('tasks').select('id,day,text,done').eq('notebook_id', nbId)
    .ilike('text', `%${q}%`).order('day', { ascending: false }).limit(60);
  return data || [];
}

export async function loadIndex(year, nbId) {
  const from = `${year - 1}-12-25`, to = `${year}-12-31`;
  const [t, p] = await Promise.all([
    sb.from('tasks').select('day,text').eq('notebook_id', nbId).gte('day', from).lte('day', to).limit(5000),
    sb.from('pages').select('id,week_start,name').eq('notebook_id', nbId).eq('section', 'week').eq('kind', 'extra').gte('week_start', from).lte('week_start', to),
  ]);
  const weeks = new Set();
  const tags = {};
  for (const r of t.data || []) {
    weeks.add(weekStart(r.day));
    for (const m of r.text.match(/#[\w-]+/g) || []) tags[m.toLowerCase()] = (tags[m.toLowerCase()] || 0) + 1;
  }
  const extras = {};
  for (const r of p.data || []) (extras[r.week_start] ||= []).push(r.name);
  return { weeks, tags, extras };
}

/* ---------- notebooks on the shelf ---------- */
export function useNotebooks(user) {
  const [books, setBooks] = useState(null);
  useEffect(() => {
    sb.from('notebooks').select('*').order('position').then(({ data }) => setBooks(data || []));
    const ch = sb.channel('notebooks-' + user.id + '-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notebooks' }, (p) => {
        if (p.eventType === 'DELETE') return setBooks((s) => (s || []).filter((x) => x.id !== p.old.id));
        setBooks((s) => [...(s || []).filter((x) => x.id !== p.new.id), p.new].sort((a, b) => a.position - b.position));
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [user.id]);
  const api = {
    add(row) {
      const b = { id: uid(), position: Date.now(), ...row };
      setBooks((s) => [...(s || []), b]);
      sb.from('notebooks').insert(b).then(logErr);
      return b.id;
    },
    update(id, patch) {
      setBooks((s) => (s || []).map((x) => (x.id === id ? { ...x, ...patch } : x)).sort((a, b) => a.position - b.position));
      sb.from('notebooks').update(patch).eq('id', id).then(logErr);
    },
    remove(id) {
      setBooks((s) => (s || []).filter((x) => x.id !== id));
      sb.from('notebooks').delete().eq('id', id).then(logErr);
    },
  };
  return [books, api];
}

/* ---------- one month: the calendar page + task counts per day ---------- */
export function useMonth(monthStart, gridStart, gridEnd, nbId, enabled, withCover) {
  const [page, setPage] = useState(null);
  const [cover, setCover] = useState(null);
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    if (!enabled || !nbId) return;
    let live = true;
    setPage(null);
    const loadTasks = () => sb.from('tasks').select('id,day,done').eq('notebook_id', nbId).gte('day', gridStart).lte('day', gridEnd).limit(3000)
      .then(({ data }) => { if (live) setTasks(data || []); });
    (async () => {
      let { data } = await sb.from('pages').select('*').eq('notebook_id', nbId).eq('kind', 'month').eq('week_start', monthStart).limit(1);
      let pg = data?.[0];
      if (!pg) {
        const ins = await sb.from('pages').insert({ week_start: monthStart, kind: 'month', name: 'Month', notebook_id: nbId, section: 'week' }).select().single();
        pg = ins.data || (await sb.from('pages').select('*').eq('notebook_id', nbId).eq('kind', 'month').eq('week_start', monthStart).limit(1)).data?.[0];
      }
      if (live) setPage(pg || null);
      // The month's cover page (left page of the spread on PC).
      if (withCover) {
        const q = () => sb.from('pages').select('*').eq('notebook_id', nbId).eq('section', 'monthcover').eq('week_start', monthStart).limit(1);
        let cv = (await q()).data?.[0];
        if (!cv) cv = (await sb.from('pages').insert({ week_start: monthStart, kind: 'extra', name: 'Month cover', notebook_id: nbId, section: 'monthcover' }).select().single()).data || (await q()).data?.[0];
        if (live) setCover(cv || null);
      }
    })();
    ensureRecurring(nbId, gridStart, gridEnd).catch(() => {}).then(loadTasks);
    const ch = sb.channel('month-' + monthStart + nbId + '-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadTasks())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pages' }, (p) => { if (!live) return; setPage((cur) => (cur && cur.id === p.new.id ? p.new : cur)); setCover((cur) => (cur && cur.id === p.new.id ? p.new : cur)); })
      .subscribe();
    return () => { live = false; sb.removeChannel(ch); };
  }, [monthStart, nbId, enabled, withCover]);
  const updateCover = (patch) => {
    setCover((p) => (p ? { ...p, ...patch } : p));
    if (cover) sb.from('pages').update(patch).eq('id', cover.id).then(logErr);
  };
  const update = (patch) => {
    setPage((p) => (p ? { ...p, ...patch } : p));
    if (page) sb.from('pages').update(patch).eq('id', page.id).then(logErr);
  };
  return { page, tasks, update, cover, updateCover };
}

/* ---------- week page decorations (drawing + stickers over the to-do list) ---------- */
// One hidden page per week holds them. It's only created the first time you decorate that week.
export function useDecor(ws, nbId, create) {
  const [pg, setPg] = useState(null);
  useEffect(() => {
    let live = true;
    setPg((p) => (p && p.week_start === ws ? p : null));
    if (!nbId) return;
    (async () => {
      const q = () => sb.from('pages').select('*').eq('notebook_id', nbId).eq('kind', 'decor').eq('week_start', ws).limit(1);
      let r = (await q()).data?.[0];
      if (!r && create) {
        const ins = await sb.from('pages').insert({ week_start: ws, kind: 'decor', name: 'Week decor', notebook_id: nbId, section: 'week' }).select().single();
        r = ins.data || (await q()).data?.[0];
      }
      if (live) setPg(r || null);
    })();
    return () => { live = false; };
  }, [ws, nbId, create]);
  // Changes made on another device (like day spacing) show up here live.
  useEffect(() => {
    if (!pg?.id) return;
    const ch = sb.channel('decor-' + pg.id + '-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pages', filter: `id=eq.${pg.id}` }, (p) => setPg((o) => (o && o.id === p.new.id ? { ...o, content: p.new.content } : o)))
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [pg?.id]);
  // Save extra bits for this week's page look (like how tall each day is).
  const patch = (c) => {
    if (!pg) return;
    const content = { ...(pg.content || {}), ...c };
    setPg({ ...pg, content });
    sb.from('pages').update({ content }).eq('id', pg.id).then(() => {});
  };
  return [pg, patch];
}

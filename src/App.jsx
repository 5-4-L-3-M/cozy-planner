import { useEffect, useMemo, useRef, useState } from 'react';
import { THEMES as ROOMS } from './Room';
import './sheetSwipe';
import { sb } from './supabase';
import { useSettings, useWeek, useNotebooks, useMonth, useDecor } from './store';
import Help from './Help';
import RefBox from './RefBox';
import { TagCtx, TagManager, PrioCtx, DEFAULT_PRIO, AllTagsCtx, TagInput } from './tags';
import { HeaderCtx, useHeaderArt } from './headers';
import { CalendarUnder, MonthCoverUnder, CalStyleSheet, dayChips, monthOf, monthRange, wsForMonth } from './Month';
import Shelf, { Cover } from './Shelf';
import { BookCharm } from './Charm';
import RefPage, { NewRefSheet } from './RefPage';
import { addDays, isoWeek, today, weekLabel, weekRange, weekStart, DAYS, parse, MONTHS } from './dates';
import WeekPage from './WeekPage';
import Canvas from './Canvas';
import TagPage from './TagPage';
import { RemCtx, ReminderSettings, todoistSyncDone } from './Reminders';
import { Toolbar, ToolPanel, FavStrip, PaperPanel, TabSheet, inkOn, TAB_COLORS } from './Tools';
import { MonthSheet, IndexPanel, Fold } from './Panels';
import Drawer from './Drawer';
import SaveSticker from './SaveSticker';
import { useStickers, uploadImage } from './items';
import { ImportStatus, filesFrom, hasFiles } from './StickerLibrary';
import Icon from './Icon';

export default function App() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return <div className="splash" />;
  if (!session) return <Auth />;
  return <Library user={session.user} />;
}

function Library({ user }) {
  const [books, api] = useNotebooks(user);
  const [openId, setOpenId] = useState(() => { try { return localStorage.getItem('openNb'); } catch { return null; } });
  const open = (id) => { setOpenId(id); try { id ? localStorage.setItem('openNb', id) : localStorage.removeItem('openNb'); } catch {} };
  // Phone back gesture: an open book sits on its own history entry, so "back" returns to the shelf.
  useEffect(() => { if (openId && !history.state?.nb) history.pushState({ nb: 1 }, ''); }, [openId]);
  useEffect(() => {
    const onPop = () => { if (!history.state?.nb) open(null); };
    addEventListener('popstate', onPop); return () => removeEventListener('popstate', onPop);
  }, []);
  const toShelf = () => { if (history.state?.nb) history.back(); else open(null); };
  if (!books) return <div className="splash" />;
  const book = books.find((b) => b.id === openId);
  if (!book) return <Shelf user={user} books={books} api={api} onOpen={open} />;
  return <Planner key={book.id} user={user} nb={book} onShelf={toShelf} />;
}

function Auth() {
  const [mode, setMode] = useState('in');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('');
    const r = mode === 'in'
      ? await sb.auth.signInWithPassword({ email, password: pw })
      : await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: location.origin } });
    setBusy(false);
    if (r.error) setMsg(r.error.message);
    else if (mode === 'up' && !r.data.session) { setMsg('Check your email and click the confirmation link, then sign in here.'); setMode('in'); }
  };
  return (
    <div className="auth">
      <form onSubmit={submit} className="authcard">
        <h1 className="hand">Planner</h1>
        <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>Password<input type="password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} /></label>
        <button className="btn primary" disabled={busy}>{mode === 'in' ? 'Sign in' : 'Create account'}</button>
        {msg && <p className="hint">{msg}</p>}
        <button type="button" className="linkbtn" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'First time? Create your account' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}

function useWide(q = '(min-width: 1000px)') {
  const [w, setW] = useState(() => matchMedia(q).matches);
  useEffect(() => { const m = matchMedia(q); const f = () => setW(m.matches); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, [q]);
  return w;
}

const paperVars = (c) => {
  const n = parseInt(c.slice(1), 16);
  const light = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 140;
  return light
    ? { '--paper': c, '--pi': '#3d3121', '--pm': '#7a6a55', '--pl': 'rgba(61,49,33,0.16)' }
    : { '--paper': c, '--pi': '#f2e8da', '--pm': '#b3a797', '--pl': 'rgba(242,232,218,0.16)' };
};

function Planner({ user, nb, onShelf }) {
  const isPlanner = nb.kind === 'planner';
  const wide = useWide();
  const sideWide = useWide('(min-width: 1500px)');
  const panelWide = useWide('(min-width: 1280px)');
  const remembered = (k) => { try { const v = localStorage.getItem(k); return v === null ? innerWidth / innerHeight >= 1.6 : v === '1'; } catch { return true; } };
  const [sideOpen, setSideOpen] = useState(() => remembered('sideOpen'));
  const [panelOpen, setPanelOpen] = useState(() => remembered('panelOpen'));
  const flip = (k, set) => set((v) => { try { localStorage.setItem(k, v ? '0' : '1'); } catch {} return !v; });
  const showSide = sideWide && sideOpen, showPanel = panelWide && panelOpen;
  const [ws, setWs] = useState(weekStart(today()));
  const [settings, update] = useSettings(user);
  const { tasks, notes, extras, pinned, nbPages, refPages, api } = useWeek(ws, user, nb.id);
  const [tab, setTab] = useState(isPlanner ? 'week' : null);
  useEffect(() => { if (!isPlanner && !tab && nbPages.length) setTab(nbPages[0].id); }, [nbPages.length]);
  const [tool, setTool] = useState('pen');
  const [hdr, hdrApi] = useHeaderArt(nb.id);
  // Focus mode: hides the header, tabs and tool bars so the page fills the screen; the floating dock carries the tools.
  const [focus, setFocusS] = useState(() => { try { return localStorage.getItem('focus') === '1'; } catch { return false; } });
  const setFocus = (v) => { setFocusS(v); try { localStorage.setItem('focus', v ? '1' : '0'); } catch { /* private mode */ } };
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') setFocus(false); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  const [drawTool, setDrawTool] = useState('pen');
  const [sheet, setSheet] = useState(null);
  const [newRefGroup, setNewRefGroup] = useState(null);
  const [query, setQuery] = useState('');
  const [tagView, setTagView] = useState(null);
  useEffect(() => { setTagView(null); }, [tab, ws]);
  const [editTab, setEditTab] = useState(null);
  const [stickers, stickerApi] = useStickers(user);
  const [washi, setWashi] = useState(null);
  // Lasso → "Save as sticker" opens a little form (name, folder with suggestions, tags).
  const [stDraft, setStDraft] = useState(null);
  const saveSticker = (draft) => setStDraft(draft);
  const stCats = [...new Set([...(settings.stickerCatOrder || []), ...stickers.map((x) => x.category)])];
  const canvas = useRef();

  const go = (w) => { setWs(w); if (tab !== 'week' && tab !== 'notes' && tab !== 'month' && tab !== 'refbox' && !pinned.some((p) => p.id === tab) && !refPages.some((p) => p.id === tab)) setTab(wide ? 'week' : 'notes'); };
  const [cy, cm] = monthOf(ws);
  const mr = monthRange(cy, cm);
  const month = useMonth(mr.first, mr.start, mr.end, nb.id, isPlanner, true);
  // Phone: the month tab flips between the month page (goals, notes…) and the calendar.
  const [monthSide, setMonthSide] = useState('cal');
  const shiftWeek = (n) => (tab === 'month' ? go(wsForMonth(cy, cm + n)) : go(addDays(ws, 7 * n)));

  const allExtras = [...pinned, ...extras, ...nbPages, ...refPages];
  const extra = allExtras.find((p) => p.id === tab);
  const isMonth = isPlanner && tab === 'month';
  const page = tab === 'refbox' ? null : extra || (isMonth ? month.page : isPlanner ? notes : null);
  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const onTool = (id) => {
    if (id === 'stickers') { setSheet('stickers'); return; }
    if (id === tool && (!wide || !showPanel) && ['pen', 'highlighter', 'eraser', 'lasso'].includes(id)) { setSheet('tools'); return; }
    setTool(id);
    if (id === 'pen' || id === 'highlighter') setDrawTool(id);
  };
  const setDrawColor = (color) => update((s) => ({ [drawTool]: { ...s[drawTool], color }, recentColors: [color, ...(s.recentColors || []).filter((x) => x !== color)].slice(0, 12) }));
  // Eyedropper from the pen settings: the menu gets out of the way until you pick (or cancel), then comes back.
  const [dropBack, setDropBack] = useState(undefined);
  const onPick = (color) => { setDrawColor(color); setTool(drawTool); if (dropBack !== undefined) { setSheet(dropBack); setDropBack(undefined); } };
  const startDrop = async () => {
    const back = sheet; setSheet(null);
    if (window.EyeDropper) {
      // On PC Chrome: pick from anywhere on your screen, even outside the planner.
      await new Promise((r) => setTimeout(r, 80));
      try { const { sRGBHex } = await new window.EyeDropper().open(); setDrawColor(sRGBHex); } catch { /* cancelled */ }
      setSheet(back); return;
    }
    setDropBack(back); setTool('eyedropper');
  };
  const cancelDrop = () => { setTool(drawTool); setSheet(dropBack ?? null); setDropBack(undefined); };
  const toolPick = (id) => (id === 'eyedropper' ? startDrop() : onTool(id));
  const applyFav = (f) => { const { tool: t, ...cfg } = f; setTool(t); setDrawTool(t); update((s) => ({ [t]: { ...s[t], ...cfg } })); };
  const onTag = (t) => { setTagView(t.toLowerCase()); setSheet(null); };
  const tagWeek = (w) => { setTagView(null); setWs(w); setTab('week'); };
  const tagOpen = (p) => {
    setTagView(null);
    if (p.kind === 'notes') { setWs(p.week_start); setTab(wide ? 'week' : 'notes'); }
    else if (p.kind === 'month') { setWs(weekStart(p.week_start)); setTab('month'); }
    else { if (p.section === 'week' && p.week_start && !p.pinned) setWs(p.week_start); setTab(p.id); }
  };
  // Every tag used in this notebook (most used first), for suggestions while typing.
  const [allTags, setAllTags] = useState([]);
  const tagSig = (tasks || []).map((t) => (t.text.match(/#[\w-]+/g) || []).join('')).join('');
  useEffect(() => {
    if (!nb?.id) return;
    let live = true;
    sb.from('tasks').select('text').eq('notebook_id', nb.id).ilike('text', '%#%').limit(3000).then(({ data }) => {
      const n = {};
      for (const r of data || []) for (const t of r.text.match(/#[\w-]+/g) || []) { const k = t.toLowerCase(); n[k] = (n[k] || 0) + 1; }
      if (live) setAllTags(Object.keys(n).sort((a, b) => n[b] - n[a]));
    });
    return () => { live = false; };
  }, [nb?.id, tagSig]);
  // Checked off in Todoist? Check it off here too (once per week you open).
  const tdSynced = useRef('');
  useEffect(() => {
    const tok = settings.todoist?.token;
    if (!tok || !tasks?.length || tdSynced.current === ws) return;
    tdSynced.current = ws; todoistSyncDone(tok, tasks, api.updateTask);
  }, [ws, tasks, settings.todoist?.token]);
  const [deco, setDeco] = useState(false);
  useEffect(() => { if (tab !== 'week') setDeco(false); }, [tab]);
  const [decoPg, patchDeco] = useDecor(ws, isPlanner ? nb.id : null, deco);
  const decoCanvas = useRef();
  // Decorations follow their day: positions are kept against one saved layout (ref) and shifted to where
  // each day actually is on this screen (and as day lines get dragged).
  const refTops = decoPg?.content?.ref;
  const [liveTops, setLiveTops] = useState(null);
  const ymap = useMemo(() => {
    const R = refTops, D = liveTops;
    if (!R || !D || R.length !== D.length) return null;
    const off = (y) => { let o = 0; for (let i = 0; i < R.length; i++) if (y >= R[i] - 4) o = D[i] - R[i]; return o; };
    const inv = (y) => { let o = 0; for (let i = 0; i < D.length; i++) if (y >= D[i] - 4) o = D[i] - R[i]; return y - o; };
    return { off, inv };
  }, [JSON.stringify(refTops), JSON.stringify(liveTops)]);
  useEffect(() => {
    // The first wide screen to show a decorated week saves its layout as the reference.
    if (decoPg && !refTops && liveTops && window.matchMedia('(min-width: 1000px)').matches) patchDeco({ ref: liveTops });
  }, [decoPg?.id, refTops, liveTops]);
  const renderDecor = decoPg ? (h) => (
    <Canvas ref={decoCanvas} page={decoPg} overlay height={h} ymap={ymap} settings={settings} tool={deco ? tool : 'pointer'} onPick={onPick} pct={pct}
      onDoubleTap={() => setTool((t) => (t === 'eraser' ? drawTool : 'eraser'))} onSetTool={setTool} washi={washi} onSaveSticker={saveSticker}
      onSettings={update} focus={false} onTool={onTool} drawTool={drawTool} onColor={() => setSheet('tools')}
      onFavShape={(f) => update((s) => ({ shapeFavs: [...(s.shapeFavs || []).filter((x) => JSON.stringify(x) !== JSON.stringify(f)), f] }))} />
  ) : null;
  const decoOn = deco && tab === 'week';
  const coverCanvas = useRef();
  const lastCv = useRef(null);
  const cvRef = decoOn ? decoCanvas : isMonth && !wide && monthSide === 'cover' ? coverCanvas : canvas;
  const weekDeco = { onTops: setLiveTops, dayH: decoPg?.content?.dayH, onDayH: (dayH) => patchDeco({ dayH }), deco: decoOn, onDeco: () => { setDeco((v) => !v); lastCv.current = deco ? null : decoCanvas; if (!deco && !['pen', 'highlighter', 'eraser', 'lasso'].includes(tool)) setTool(drawTool); }, renderDecor };
  const tagEl = tagView && <TagPage tag={tagView} nbId={nb.id} onClose={() => setTagView(null)} onWeek={tagWeek} onPage={tagOpen} spread={wide} />;

  const newPage = (section = isPlanner ? 'week' : 'notebook') => {
    if (section === 'reference') { setSheet('newref'); return; }
    const name = prompt(section === 'reference' ? 'Name this reference page' : 'Name this page');
    // Pages made on a phone start tall so a page fills the screen; PC pages start standard.
    if (name && name.trim()) setTab(api.addPage(name.trim(), { section, content: wide ? null : { shape: 'tall' } }));
  };
  const editPage = (p) => setEditTab(p.id);
  const tabColors = settings.tabColors || {};
  const colorOf = (id) => (['week', 'notes', 'month', 'refbox'].includes(id) ? tabColors[id] : allExtras.find((p) => p.id === id)?.color) || null;
  const tabStyle = (id) => { const c = colorOf(id); return c ? { background: c, borderColor: c, color: inkOn(c) } : undefined; };
  const tabCls = (base, id, on) => base + (on ? ' on' : '') + (colorOf(id) ? ' colored' : '');
  const tapTab = (id, on) => (on ? setEditTab(id) : setTab(id));
  const addProgress = () => {
    if (!notes) return;
    api.setProgress(notes.id, { x: 0.5, y: 0.5, hidden: false });
    setTab(wide ? 'week' : 'notes'); setSheet(null);
  };
  const FIXED = { week: 'Week', notes: 'Notes', month: 'Month', refbox: 'Reference' };
  const editing = editTab && (FIXED[editTab]
    ? { label: FIXED[editTab] + ' tab', name: FIXED[editTab], canEdit: false }
    : (() => { const p = allExtras.find((x) => x.id === editTab); return p && { label: p.section === 'reference' ? 'Reference page' : 'Page tab', name: p.name, canEdit: true, canPin: p.section === 'week', pinned: p.pinned }; })());
  // Drag image files (or paste them) onto the page: they land on the page as stickers.
  const dropRef = useRef(); dropRef.current = { cv: cvRef, wide, tab, setTab };
  useEffect(() => {
    const over = (e) => { if (hasFiles(e) && !e.defaultPrevented) e.preventDefault(); };
    const put = async (files) => {
      const d = dropRef.current;
      if (!d.wide && d.tab === 'week') d.setTab('notes');
      let i = 0;
      for (const f of files.filter((x) => x.type.startsWith('image/'))) {
        try {
          const { url, w, h } = await uploadImage(user, f);
          const k = Math.min(1, 320 / Math.max(w, h));
          setTimeout(() => dropRef.current.cv.current?.place('sticker', { src: 'image', url }, Math.round(w * k), Math.round(h * k)), 60 + 40 * i++);
        } catch (err) { alert('Couldn’t add that image: ' + (err.message || err)); }
      }
    };
    const drop = async (e) => { if (!hasFiles(e) || e.defaultPrevented) return; e.preventDefault(); put(await filesFrom(e.dataTransfer)); };
    const paste = (e) => {
      if (e.defaultPrevented || e.target.closest?.('input,textarea,[contenteditable]') || document.querySelector('.lib')) return;
      const f = [...(e.clipboardData?.files || [])].filter((x) => x.type.startsWith('image/'));
      if (f.length) { e.preventDefault(); put(f); }
    };
    addEventListener('dragover', over); addEventListener('drop', drop); addEventListener('paste', paste);
    return () => { removeEventListener('dragover', over); removeEventListener('drop', drop); removeEventListener('paste', paste); };
  }, [user]);
  const overlays = (
    <>
      {stDraft && <SaveSticker draft={stDraft} cats={stCats} last={settings.lastStickerCat} onClose={() => setStDraft(null)}
        onSave={({ name, category, tags }) => {
          const { strokes, w0, h0 } = stDraft;
          stickerApi.add({ category, kind: 'strokes', w: w0, h: h0, data: { strokes, ...(name ? { name } : {}), ...(tags.length ? { tags } : {}) } });
          update((st) => { const order = st.stickerCatOrder || []; return { lastStickerCat: category, stickerCatOrder: order.includes(category) ? order : [...order, category] }; });
          setStDraft(null);
        }} />}
      <ImportStatus />
      {editing && (
        <TabSheet {...editing} color={colorOf(editTab)} onClose={() => setEditTab(null)}
          presets={settings.tabPresets || TAB_COLORS} onPresets={(arr) => update({ tabPresets: arr })}
          onSave={({ name, color, pinned: pin }) => {
            if (FIXED[editTab]) update((s) => ({ tabColors: { ...(s.tabColors || {}), [editTab]: color } }));
            else {
              const was = allExtras.find((p) => p.id === editTab);
              api.updatePage(editTab, { name, color, pinned: pin, ...(was?.pinned && !pin ? { week_start: ws } : {}) });
            }
          }}
          onDelete={() => { api.deletePage(editTab); setTab(isPlanner ? (wide ? 'week' : 'notes') : nbPages.find((p) => p.id !== editTab)?.id || null); }} />
      )}
      {sheet === 'stickers' && (
        <Drawer user={user} stickers={stickers} stickerApi={stickerApi} settings={settings} update={update}
          penColor={settings.pen.color} onClose={() => setSheet(null)}
          progress={<button className="sttile" onClick={addProgress} disabled={!notes || !notes.progress?.hidden}>
                <span className="prog-demo"><span><i /></span><b>50%</b></span>
                <small>{notes && !notes.progress?.hidden ? 'Already on this week' : 'Week progress'}</small>
              </button>}
          onPlace={(kind, data, w, h) => {
            setSheet(null);
            if (!wide && tab === 'week') setTab('notes');
            setTimeout(() => cvRef.current?.place(kind, data, w, h), 60);
          }}
          onWashi={(w) => { setWashi(w); setTool('washi'); setSheet(null); if (!wide && tab === 'week') setTab('notes'); }} />
      )}
      {sheet === 'help' && <Help onClose={() => setSheet(null)} />}
      {tool === 'eyedropper' && dropBack !== undefined && (
        <div className="dropbar"><span>Tap a color on the page</span><button onClick={cancelDrop}>Cancel</button></div>
      )}
      {sheet === 'reminders' && <ReminderSettings settings={settings} update={update} onClose={() => setSheet(null)} />}
      {sheet === 'tags' && <TagManager nbId={nb.id} year={parse(addDays(ws, 3)).getFullYear()} styles={settings.tagStyles} onChange={(tagStyles) => update({ tagStyles })} onClose={() => setSheet(null)} prio={settings.prioColors || DEFAULT_PRIO} onPrio={(prioColors) => update({ prioColors })} />}
      {sheet === 'calstyle' && <CalStyleSheet cal={settings.cal} onChange={(cal) => update({ cal })} onClose={() => setSheet(null)} hdr={hdr} onRemoveHeader={hdrApi.remove} />}
      {sheet === 'month' && <MonthSheet ws={ws} go={go} onClose={() => setSheet(null)} />}
      {sheet === 'newref' && <NewRefSheet onClose={() => setSheet(null)}
        onCreate={(name, type) => setTab(api.addPage(name, { section: 'reference', ref_type: type, ref_group: newRefGroup, content: type === 'freeform' ? (wide ? null : { shape: 'tall' }) : { rows: [] } }))} />}
    </>
  );

  useEffect(() => {
    const k = (e) => {
      if (!(e.ctrlKey || e.metaKey) || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); (lastCv.current || canvas).current?.undo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey) || e.key === 'Z') { e.preventDefault(); (lastCv.current || canvas).current?.redo(); }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, []);

  const typedRef = page?.section === 'reference' && page.ref_type && page.ref_type !== 'freeform';
  const paperProps = { settings, update, page,
    onPageShape: page && !typedRef ? (shape) => (isMonth ? month.update : (patch) => api.updatePage(page.id, patch))({ content: { ...(page.content || {}), shape } }) : null, top: isMonth ? <button className="mini calstylebtn" onClick={() => setSheet('calstyle')}>Calendar style &amp; parts…</button> : null, onPagePaper: (paper) => page && (isMonth ? month.update({ paper }) : api.updatePage(page.id, { paper })) };
  const canvasEl = page && (
    <Canvas ref={canvas} page={page} settings={settings} tool={tool} onPick={onPick} pct={pct}
      onDoubleTap={() => setTool((t) => (t === 'eraser' ? drawTool : 'eraser'))}
      onSetTool={setTool} washi={washi} onSaveSticker={saveSticker}
      onSettings={update} pageSettings={<PaperPanel {...paperProps} />} spread={wide && !isMonth && !(isPlanner && tab === 'week')}
      focus={focus} onFocus={setFocus} onTool={onTool} drawTool={drawTool} onColor={() => setSheet('tools')}
      onFavShape={(f) => update((s) => ({ shapeFavs: [...(s.shapeFavs || []).filter((x) => JSON.stringify(x) !== JSON.stringify(f)), f] }))}
      progress={page.kind === 'notes' ? page.progress : null} onProgress={(pr) => api.setProgress(page.id, pr)}
      onAddSheet={(n) => (isMonth ? month.update : (patch) => api.updatePage(page.id, patch))({ content: { ...(page.content || {}), sheets: n } })}
      under={isMonth ? <CalendarUnder y={cy} m={cm} tasks={month.tasks} cal={settings.cal} hdr={hdr} /> : null}
      headerCtx={isPlanner ? { y: cy, m: cm, monthName: MONTHS[cm] } : null} onSaveHeader={hdrApi.save}
      chips={isMonth ? [...dayChips(cy, cm, (day) => { go(weekStart(day)); setTab('week'); })] : null} />
  );
  // PC month spread: a decorated cover page on the left, the calendar on the right.
  const coverEl = isMonth && month.cover && (
    <Canvas ref={coverCanvas} page={month.cover} settings={settings} tool={tool} onPick={onPick} pct={pct}
      onDoubleTap={() => setTool((t) => (t === 'eraser' ? drawTool : 'eraser'))}
      onSetTool={setTool} washi={washi} onSaveSticker={saveSticker} onSettings={update}
      focus={false} onTool={onTool} drawTool={drawTool} onColor={() => setSheet('tools')}
      onFavShape={(f) => update((s) => ({ shapeFavs: [...(s.shapeFavs || []).filter((x) => JSON.stringify(x) !== JSON.stringify(f)), f] }))}
      onAddSheet={(n) => month.updateCover({ content: { ...(month.cover.content || {}), sheets: n } })}
      under={<MonthCoverUnder y={cy} m={cm} cal={settings.cal} hdr={hdr} />}
      headerCtx={{ y: cy, m: cm, monthName: MONTHS[cm] }} onSaveHeader={hdrApi.save} />
  );
  const isRefBox = tab === 'refbox';
  const inRef = isRefBox || extra?.section === 'reference';
  const refGroups = (settings.refGroups || {})[nb.id] || [];
  const backToBox = extra?.section === 'reference' && <div className="rbbackwrap"><button className="rbback" onClick={() => setTab('refbox')} aria-label="Back to the reference box">← Box</button></div>;
  const pageEl = isRefBox
    ? <RefBox pages={refPages} groups={refGroups} onGroups={(g) => update((s) => ({ refGroups: { ...(s.refGroups || {}), [nb.id]: g } }))}
        onOpen={(id) => setTab(id)} onNew={(g) => { setNewRefGroup(g); setSheet('newref'); }}
        onUpdate={(id, patch) => api.updatePage(id, patch)} onDelete={(id) => api.deletePage(id)}
        stickers={stickers} presets={settings.refColorPresets} onPresets={(arr) => update({ refColorPresets: arr })} />
    : typedRef ? <>{backToBox}<RefPage page={page} onSave={(content) => api.updatePage(page.id, { content })} /></>
    : canvasEl && backToBox ? <>{backToBox}{canvasEl}</> : canvasEl;
  const panel = (
    <ToolPanel tool={tool} drawTool={drawTool} settings={settings} update={update} onTool={toolPick} />
  );
  const title = !isPlanner ? (
    <div className="title"><span className="t">{nb.name}</span><span className="s">{(extra?.name || '').toUpperCase()}</span></div>
  ) : (
    <button className="title" onClick={() => setSheet('month')}>
      <span className="t">{weekLabel(ws)} <Icon n="chevd" s={18} /></span>
      <span className="s">WEEK {isoWeek(ws)} · {weekRange(ws).toUpperCase()}</span>
    </button>
  );
  const isThisWeek = ws === weekStart(today());
  const openPage = (id, close) => { setTab(id); if (close) setSheet(null); };
  const refSection = (close) => (
    <div className="refsec">
      {!isPlanner && (
        <Fold id="pages" label="PAGES">
          {nbPages.map((p) => <button key={p.id} className={'iweek' + (tab === p.id ? ' cur' : '')} onClick={() => openPage(p.id, close)}>{p.name}</button>)}
          <button className="mini" onClick={() => newPage('notebook')}>+ Page</button>
        </Fold>
      )}
      <Fold id="reference" label="REFERENCE">
        <button className={'iweek' + (inRef ? ' cur' : '')} onClick={() => openPage('refbox', close)}>Reference box <small style={{ opacity: 0.6 }}>· {refPages.length} card{refPages.length === 1 ? '' : 's'}</small></button>
      </Fold>
    </div>
  );
  const coverStyle = { '--c': nb.color, '--accent': nb.color };
  const shelfBtn = <button className="sq" aria-label="Back to shelf" title="Back to shelf" onClick={onShelf}><Icon n="books" s={22} /></button>;

  const wrapTags = (el) => <AllTagsCtx.Provider value={allTags}><RemCtx.Provider value={{ settings, update }}><HeaderCtx.Provider value={hdr}><TagCtx.Provider value={settings.tagStyles || {}}><PrioCtx.Provider value={settings.prioColors || DEFAULT_PRIO}>{el}</PrioCtx.Provider></TagCtx.Provider></HeaderCtx.Provider></RemCtx.Provider></AllTagsCtx.Provider>;
  if (wide) {
    // On PC the space around the journal wears your room's wall (color + wallpaper).
    const rm = settings.room, rt = rm?.theme && ROOMS[rm.theme] ? { ...ROOMS[rm.theme], ...Object.fromEntries(Object.entries(rm.look || {}).filter(([, v]) => v != null)) } : null;
    return wrapTags(
      <div className={'desk' + (showSide ? '' : ' noside') + (showPanel ? '' : ' nopanel') + (focus && page && !typedRef ? ' focus' : '') + (rt ? ' roomdesk p-' + (rt.pat || 'none') : '')} style={{ ...paperVars(settings.paperColor), ...(rt ? { '--wall': rt.wall, '--rink': rt.ink } : {}) }}>
        {rt && <div className="rwall deskwall" />}
        <aside className="side">
          <IndexPanel ws={ws} go={go} query={query} setQuery={setQuery} onSignOut={() => sb.auth.signOut()} onHelp={() => setSheet('help')} onReminders={() => setSheet('reminders')} onTags={() => setSheet('tags')} nbId={nb.id} refSection={refSection(false)} noWeeks={!isPlanner} onTag={onTag} />
        </aside>
        <div className="center">
          <header className="hdr">
            <button className="sq" aria-label="Show or hide index and search" title="Index and search"
              onClick={() => (sideWide ? flip('sideOpen', setSideOpen) : setSheet('index'))}><Icon n="menu" s={22} /></button>
            {shelfBtn}
            {isPlanner && <button className="sq" aria-label="Previous week" onClick={() => shiftWeek(-1)}><Icon n="chevl" /></button>}
            {isPlanner && <button className="sq" aria-label="Next week" onClick={() => shiftWeek(1)}><Icon n="chevr" /></button>}
            {title}
            {isPlanner && !isThisWeek && <button className="btn rose" onClick={() => go(weekStart(today()))}>Today</button>}
          </header>
          <div className="book" style={coverStyle}>
          <div className="opencover">
            {nb.charm && <BookCharm type={nb.charm} color={nb.color} at={16} />}
            {tagEl ? <div className="spread rbspread tgwrap">{tagEl}</div> : <div className={'spread' + ((isPlanner && !isMonth && !inRef) || coverEl || isRefBox || typedRef ? '' : ' single') + (isRefBox || typedRef ? ' rbspread' : '')}>
              {wide && coverEl && <div className="cwrap" onPointerDownCapture={() => { lastCv.current = coverCanvas; }}>{coverEl}</div>}
              {isPlanner && !isMonth && !inRef && <WeekPage ws={ws} tasks={tasks} api={api} onTag={onTag} showHead {...weekDeco} />}
              <div className="cwrap" style={page?.paper?.color ? { background: page.paper.color } : undefined} onPointerDownCapture={() => { lastCv.current = canvas; }}>
                {pageEl || (isMonth ? null : <EmptyPages onAdd={() => newPage('notebook')} />)}
              </div>
            </div>}
          </div>
          <nav className="vtabs" aria-label="Pages">
            {isPlanner && <button className={tabCls('vtab', 'month', isMonth)} style={tabStyle('month')} onClick={() => tapTab('month', isMonth)} title="Click again to change its color">Month</button>}
            {isPlanner && <button className={tabCls('vtab', 'week', !extra && !isMonth)} style={tabStyle('week')} onClick={() => tapTab('week', !extra && !isMonth)}
              title="Click again to change its color">Week</button>}
            {(isPlanner ? [...pinned, ...extras] : nbPages).map((p) => (
              <button key={p.id} className={tabCls('vtab', p.id, tab === p.id) + (p.pinned ? ' pinned' : '')} style={tabStyle(p.id)} onClick={() => tapTab(p.id, tab === p.id)}
                onContextMenu={(e) => { e.preventDefault(); editPage(p); }} title="Click again to rename or recolor">{p.name}</button>
            ))}
            <button className={tabCls('vtab', 'refbox', inRef)} style={tabStyle('refbox')} onClick={() => tapTab('refbox', isRefBox)} title="Your reference cards">Reference</button>
            <button className="vtab add" aria-label="Add a page" onClick={() => newPage()}>+</button>
          </nav>
          </div>
        </div>
        <aside className="panel">
          {panel}
        </aside>
        <Toolbar tool={tool} onTool={onTool} vertical onUndo={() => cvRef.current?.undo()} onRedo={() => cvRef.current?.redo()}
          favs={<FavStrip settings={{ ...settings, activeTool: tool }} update={update} applyFav={applyFav} vertical />}
          onMore={() => setSheet('paper')} onFocus={() => setFocus(true)} onPages={!typedRef && page ? () => canvas.current?.openSorter() : undefined}
          onPanel={() => (panelWide ? flip('panelOpen', setPanelOpen) : setSheet('tools'))} />
        {overlays}
        {sheet === 'index' && (
          <>
            <div className="sheet-bg" onClick={() => setSheet(null)} />
            <aside className="drawer"><IndexPanel ws={ws} go={go} query={query} setQuery={setQuery} onDone={() => setSheet(null)} onSignOut={() => sb.auth.signOut()} onHelp={() => setSheet('help')} onReminders={() => setSheet('reminders')} onTags={() => setSheet('tags')} nbId={nb.id} refSection={refSection(true)} noWeeks={!isPlanner} onTag={onTag} /></aside>
          </>
        )}
        {sheet === 'paper' && (
          <>
            <div className="sheet-bg" onClick={() => setSheet(null)} />
            <section className="sheet" aria-label="Page settings">
              <div className="grab" />
              <div className="ptitle hand">Page</div>
              <PaperPanel {...paperProps} />
              <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setSheet(null)}>Done</button>
            </section>
          </>
        )}
        {sheet === 'tools' && (
          <>
            <div className="sheet-bg" onClick={() => setSheet(null)} />
            <section className="sheet">
              <div className="grab" />
              <FavStrip settings={settings} update={update} applyFav={applyFav} />
              {panel}
              <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setSheet(null)}>Done</button>
            </section>
          </>
        )}
      </div>
    );
  }

  /* ---------- phone ---------- */
  const onCanvasTab = ((!isPlanner || tab !== 'week') || decoOn) && !isRefBox && !typedRef;
  return wrapTags(
    <div className={'phone' + (onCanvasTab ? ' tbtop' : '') + (focus && onCanvasTab && !typedRef ? ' focus' : '')} style={{ ...paperVars(settings.paperColor), ...coverStyle }}>
      <header className="hdr">
        <button className="sq" aria-label="Index and search" onClick={() => setSheet('index')}><Icon n="menu" s={22} /></button>
        {shelfBtn}
        {title}
        {onCanvasTab ? (
          <>
            <button className="sq" aria-label="Undo" onClick={() => cvRef.current?.undo()}><Icon n="undo" /></button>
            <button className="sq" aria-label="Redo" onClick={() => cvRef.current?.redo()}><Icon n="redo" /></button>
          </>
        ) : (
          isPlanner && !isThisWeek && <button className="btn rose" onClick={() => go(weekStart(today()))}>Today</button>
        )}
      </header>
      <div className="pcover">
      <nav className="tabs" aria-label="Pages">
        {!isPlanner && nbPages.map((p) => (
          <button key={p.id} className={tabCls('tab', p.id, tab === p.id)} style={tabStyle(p.id)} onClick={() => tapTab(p.id, tab === p.id)}>{p.name}</button>
        ))}
        {isPlanner && <button className={tabCls('tab', 'month', isMonth)} style={tabStyle('month')} onClick={() => tapTab('month', isMonth)}>Month</button>}
        {isPlanner && <button className={tabCls('tab', 'week', tab === 'week')} style={tabStyle('week')} onClick={() => tapTab('week', tab === 'week')}>Week</button>}
        {isPlanner && pinned.map((p) => (
          <button key={p.id} className={tabCls('tab', p.id, tab === p.id) + ' pinned'} style={tabStyle(p.id)} onClick={() => tapTab(p.id, tab === p.id)}>{p.name}</button>
        ))}
        {isPlanner && <button className={tabCls('tab', 'notes', tab === 'notes')} style={tabStyle('notes')} onClick={() => tapTab('notes', tab === 'notes')}>Notes</button>}
        {isPlanner && extras.map((p) => (
          <button key={p.id} className={tabCls('tab', p.id, tab === p.id)} style={tabStyle(p.id)} onClick={() => tapTab(p.id, tab === p.id)}
            onContextMenu={(e) => { e.preventDefault(); editPage(p); }}>{p.name}</button>
        ))}
        <button className={tabCls('tab', 'refbox', inRef)} style={tabStyle('refbox')} onClick={() => tapTab('refbox', isRefBox)}>Reference</button>
        <button className="tab add" aria-label="Add a page" onClick={() => newPage()}>+</button>
      </nav>
      <Swipe className="pmain" onSwipe={(n) => {
        if (decoOn) return;
        if (tab !== 'week' && cvRef.current && !cvRef.current.canSwipe()) return;
        const order = isPlanner ? ['month', 'week', ...pinned.map((p) => p.id), 'notes', ...extras.map((p) => p.id), 'refbox'] : [...nbPages.map((p) => p.id), 'refbox'];
        const next = order[order.indexOf(tab) + n];
        if (next) setTab(next);
      }}>
        {isMonth && !tagEl && (
          <div className="monthsw" role="tablist">
            <button className={monthSide === 'cover' ? 'on' : ''} onClick={() => { setMonthSide('cover'); lastCv.current = coverCanvas; }}>Month page</button>
            <button className={monthSide === 'cal' ? 'on' : ''} onClick={() => { setMonthSide('cal'); lastCv.current = canvas; }}>Calendar</button>
          </div>
        )}
        {tagEl || (isPlanner && tab === 'week' ? <WeekPage ws={ws} tasks={tasks} api={api} onTag={onTag} {...weekDeco} /> : isMonth && monthSide === 'cover' ? coverEl : pageEl || (isMonth ? null : <EmptyPages onAdd={() => newPage('notebook')} />))}
      </Swipe>
      </div>
      <footer className="pfoot">
        {isPlanner && tab === 'week' && !decoOn ? <AddBar ws={ws} api={api} /> : typedRef || isRefBox ? null : (
          <>
            <Toolbar tool={tool} onTool={onTool} onFocus={() => setFocus(true)} onPages={!typedRef && page ? () => canvas.current?.openSorter() : undefined} />
          </>
        )}
      </footer>
      {overlays}
      {sheet === 'index' && (
        <>
          <div className="sheet-bg" onClick={() => setSheet(null)} />
          <aside className="drawer"><IndexPanel ws={ws} go={go} query={query} setQuery={setQuery} onDone={() => setSheet(null)} onSignOut={() => sb.auth.signOut()} onHelp={() => setSheet('help')} onReminders={() => setSheet('reminders')} onTags={() => setSheet('tags')}
            nbId={nb.id} refSection={refSection(true)} noWeeks={!isPlanner} onTag={onTag} /></aside>
        </>
      )}
      {sheet === 'tools' && (
        <>
          <div className="sheet-bg" onClick={() => setSheet(null)} />
          <section className="sheet">
            <div className="grab" />
            <FavStrip settings={{ ...settings, activeTool: tool }} update={update} applyFav={applyFav} />
            {panel}
            <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setSheet(null)}>Done</button>
          </section>
        </>
      )}
    </div>
  );
}

function EmptyPages({ onAdd }) {
  return (
    <div className="emptypages">
      <p className="hand">No pages yet</p>
      <button className="btn primary" onClick={onAdd}>+ Add a page</button>
    </div>
  );
}

function Swipe({ onSwipe, children, className }) {
  const s = useRef(null);
  return (
    <main className={className}
      onTouchStart={(e) => {
        const t = e.touches[0];
        s.current = e.touches.length === 1 && t.touchType !== 'stylus' && (t.radiusX || 0) < 25 ? { x: t.clientX, y: t.clientY } : null;
      }}
      onTouchMove={(e) => { if (e.touches.length > 1) s.current = null; }}
      onTouchEnd={(e) => {
        if (!s.current || e.touches.length) { s.current = null; return; }
        const t = e.changedTouches[0];
        const dx = t.clientX - s.current.x, dy = t.clientY - s.current.y;
        s.current = null;
        if (Math.abs(dx) > 80 && Math.abs(dx) > 2 * Math.abs(dy)) onSwipe(dx < 0 ? 1 : -1);
      }}>
      {children}
    </main>
  );
}

function AddBar({ ws, api }) {
  const t0 = today();
  const idx = Math.max(0, Math.min(6, Math.round((parse(t0) - parse(ws)) / 864e5)));
  const [day, setDay] = useState(addDays(ws, t0 >= ws && t0 <= addDays(ws, 6) ? idx : 0));
  const [text, setText] = useState('');
  useEffect(() => { setDay(addDays(ws, t0 >= ws && t0 <= addDays(ws, 6) ? idx : 0)); }, [ws]);
  const submit = (e) => { e.preventDefault(); if (text.trim()) { api.addTask(day, text.trim()); setText(''); } };
  return (
    <form className="addbar" onSubmit={submit}>
      <select value={day} onChange={(e) => setDay(e.target.value)} aria-label="Day">
        {DAYS.map((d, i) => <option key={d} value={addDays(ws, i)}>{d}</option>)}
      </select>
      <TagInput up value={text} onChange={(e) => setText(e.target.value)} placeholder="add task…" aria-label="New task" />
      <button className="send" aria-label="Add task"><Icon n="up" /></button>
    </form>
  );
}

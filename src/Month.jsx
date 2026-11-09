import { MONTHS, addDays, iso, parse, today, weekStart } from './dates';
import { W } from './geom';
import { ArtFit, monthKey } from './headers';

// Month calendar drawn as the background of a normal drawing page, so stickers and pen work on top of it.
// Parts of the calendar you can switch off (and draw in yourself). All on by default.
export const CAL_PARTS = [['title', 'Month name'], ['year', 'Year'], ['weekdays', 'Weekday names'], ['boxes', 'Day boxes'], ['numbers', 'Dates'], ['today', 'Today circle'], ['dots', 'To-do dots'], ['outside', 'Other months’ days']];
export const CAL_STYLES = [['boxes', 'Boxes'], ['grid', 'Grid'], ['minimal', 'Minimal'], ['circles', 'Circles']];
export const CAL_ACCENTS = ['#c97d8a', '#cf826d', '#d4a24c', '#8a9a6c', '#4f8380', '#6e819c', '#9d7aa8', '#3d3121'];
export const CAL_CELLS = ['#fbf4ea', '#f5d7dd', '#fbf0cf', '#dfe6d4', '#dbe7fa', '#ece4f0', '#ffffff', 'none'];
const FONT = "'Patrick Hand', cursive", INK = '#3d3121';
const X0 = 40, Y_HEAD = 200, Y0 = 228, Y1 = 1262, CW = (W - X0 * 2) / 7, RH = (Y1 - Y0) / 6;

export function monthOf(ws) { const d = parse(addDays(ws, 3)); return [d.getFullYear(), d.getMonth()]; }
export function monthRange(y, m) {
  const first = iso(new Date(y, m, 1)), start = weekStart(first);
  return { first, start, end: addDays(start, 41) };
}
// A week whose middle sits inside month m, so the title and calendar agree.
export const wsForMonth = (y, m) => weekStart(iso(new Date(y, m, 4)));

export function cellOf(i) { return { x: X0 + (i % 7) * CW, y: Y0 + Math.floor(i / 7) * RH }; }

export function CalendarUnder({ y, m, tasks, cal = {}, hdr = {} }) {
  const style = cal.style || 'boxes', accent = cal.accent || '#c97d8a', cell = cal.cell || '#fbf4ea';
  const { start } = monthRange(y, m), t0 = today();
  const off = new Set(cal.hide || []), show = (k) => !off.has(k);
  const by = {};
  for (const t of tasks) (by[t.day] ||= []).push(t);
  return (
    <g pointerEvents="none">
      {show('title') && (hdr[monthKey(y, m)] ? <ArtFit art={hdr[monthKey(y, m)]} x={X0} y={28} w={600} h={118} />
        : <text x={X0 + 6} y="128" fontFamily={FONT} fontSize="92" fill={accent}>{MONTHS[m]}</text>)}
      {show('year') && (hdr[`y-${y}`] ? <ArtFit art={hdr[`y-${y}`]} x={W - X0 - 230} y={74} w={230} h={66} align="end" />
        : <text x={W - X0 - 6} y="128" textAnchor="end" fontFamily={FONT} fontSize="46" fill={INK} opacity=".55">{y}</text>)}
      {show('weekdays') && ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (hdr[`wd-${i}`]
        ? <ArtFit key={d} art={hdr[`wd-${i}`]} x={X0 + i * CW + 6} y={Y_HEAD - 34} w={CW - 12} h={42} align="middle" />
        : <text key={d} x={X0 + i * CW + CW / 2} y={Y_HEAD} textAnchor="middle" fontFamily={FONT} fontSize="28" fill={i > 4 ? accent : INK} opacity=".8">{d.toUpperCase()}</text>))}
      {style === 'minimal' && show('weekdays') && <path d={`M${X0} ${Y_HEAD + 12}H${W - X0}`} stroke={accent} strokeWidth="3" />}
      {style === 'grid' && show('boxes') && (
        <g stroke={INK} strokeOpacity=".28" strokeWidth="2" fill="none">
          {cell !== 'none' && <rect x={X0} y={Y0} width={CW * 7} height={RH * 6} fill={cell} stroke="none" />}
          <rect x={X0} y={Y0} width={CW * 7} height={RH * 6} />
          {Array.from({ length: 6 }, (_, i) => <path key={'v' + i} d={`M${X0 + (i + 1) * CW} ${Y0}V${Y1}`} />)}
          {Array.from({ length: 5 }, (_, i) => <path key={'h' + i} d={`M${X0} ${Y0 + (i + 1) * RH}H${W - X0}`} />)}
        </g>
      )}
      {Array.from({ length: 42 }, (_, i) => {
        const day = addDays(start, i), d = parse(day), inM = d.getMonth() === m, { x, y: cy } = cellOf(i);
        if (!inM && !show('outside')) return null;
        const list = by[day] || [], isToday = day === t0;
        const dots = list.slice(0, 7);
        return (
          <g key={day} opacity={inM ? 1 : 0.38}>
            {style === 'boxes' && show('boxes') && <rect x={x + 5} y={cy + 5} width={CW - 10} height={RH - 10} rx="14" fill={cell === 'none' ? 'none' : cell} stroke={INK} strokeOpacity=".18" strokeWidth="2" />}
            {style === 'circles' && show('boxes') && <circle cx={x + 36} cy={cy + 36} r="25" fill={cell === 'none' ? 'none' : cell} stroke={INK} strokeOpacity=".2" strokeWidth="2" />}
            {isToday && show('today') && <circle cx={x + 36} cy={cy + 36} r="26" fill="none" stroke={accent} strokeWidth="4" />}
            {show('numbers') && <text x={x + 36} y={cy + 46} textAnchor="middle" fontFamily={FONT} fontSize="30" fill={isToday && show('today') ? accent : INK}>{d.getDate()}</text>}
            {show('dots') && dots.map((t, k) => (
              <circle key={t.id} cx={x + 20 + k * 15} cy={cy + RH - 22} r="5.5" fill={t.done ? 'none' : accent} stroke={accent} strokeWidth="2.4" />
            ))}
            {show('dots') && list.length > 7 && <text x={x + 20 + 7 * 15} y={cy + RH - 15} fontFamily={FONT} fontSize="20" fill={accent}>+{list.length - 7}</text>}
          </g>
        );
      })}
    </g>
  );
}

// Tappable date numbers: tap a day's number to jump to that week.
export function dayChips(y, m, onDay) {
  const { start } = monthRange(y, m);
  return Array.from({ length: 42 }, (_, i) => {
    const day = addDays(start, i), { x, y: cy } = cellOf(i);
    return { key: day, x: x + 6, y: cy + 6, w: 62, h: 62, label: 'Go to the week of ' + day, onClick: () => onDay(day) };
  });
}

export function CalStyleSheet({ cal = {}, onChange, onClose, hdr = {}, onRemoveHeader }) {
  const set = (p) => onChange({ ...cal, ...p });
  const style = cal.style || 'boxes', accent = cal.accent || '#c97d8a', cell = cal.cell || '#fbf4ea';
  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <section className="sheet" aria-label="Calendar style">
        <div className="grab" />
        <div className="ptitle hand">Calendar style</div>
        <div className="seg" style={{ marginTop: 8 }}>
          {CAL_STYLES.map(([id, l]) => <button key={id} className={style === id ? 'on' : ''} onClick={() => set({ style: id })}>{l}</button>)}
        </div>
        <div className="ptitle small" style={{ marginTop: 14 }}>ACCENT (month name, today, dots)</div>
        <div className="swatches" style={{ marginTop: 8 }}>
          {CAL_ACCENTS.map((c) => <button key={c} className={'sw' + (accent === c ? ' on' : '')} style={{ background: c }} aria-label={'Accent ' + c} onClick={() => set({ accent: c })} />)}
          <label className="sw custom" title="Custom accent"><input type="color" value={accent} onChange={(e) => set({ accent: e.target.value })} aria-label="Custom accent color" /></label>
        </div>
        <div className="ptitle small" style={{ marginTop: 14 }}>DAY COLOR</div>
        <div className="swatches" style={{ marginTop: 8 }}>
          {CAL_CELLS.map((c) => <button key={c} className={'sw' + (cell === c ? ' on' : '') + (c === 'none' ? ' auto' : '')} style={{ background: c === 'none' ? 'transparent' : c }} aria-label={c === 'none' ? 'No fill' : 'Day color ' + c} onClick={() => set({ cell: c })}>{c === 'none' ? 'None' : ''}</button>)}
          <label className="sw custom" title="Custom day color"><input type="color" value={cell === 'none' ? '#fbf4ea' : cell} onChange={(e) => set({ cell: e.target.value })} aria-label="Custom day color" /></label>
        </div>
        <div className="ptitle small" style={{ marginTop: 14 }}>SHOW ON PAGE</div>
        <p className="hint" style={{ margin: '2px 0 8px' }}>Turn a part off to draw it in yourself.</p>
        <div className="calparts">
          {CAL_PARTS.map(([k, l]) => {
            const on = !(cal.hide || []).includes(k);
            return <button key={k} className={'calpart' + (on ? ' on' : '')} aria-pressed={on} onClick={() => set({ hide: on ? [...(cal.hide || []), k] : (cal.hide || []).filter((x) => x !== k) })}>{on ? '✓ ' : ''}{l}</button>;
          })}
        </div>
        {Object.keys(hdr).length > 0 && <>
          <div className="ptitle small" style={{ marginTop: 14 }}>YOUR DRAWN HEADERS</div>
          <div className="calparts">
            {Object.keys(hdr).sort().map((k) => {
              const [t, a, b] = k.split('-');
              const label = t === 'm' ? `${MONTHS[+b]} ${a}` : t === 'y' ? a : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][+a];
              return <button key={k} className="calpart on" onClick={() => confirm(`Go back to the typed ${label}?`) && onRemoveHeader(k)}>{label} ✕</button>;
            })}
          </div>
        </>}
        <p className="hint" style={{ marginTop: 12 }}>Dots show that day's to-dos — filled for open, hollow for done. Tap a date number to open that week.</p>
        <button className="btn primary" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>Done</button>
      </section>
    </>
  );
}

// Month cover (left page on PC): big month name, little sparkles, and soft sections to fill in.
export function MonthCoverUnder({ y, m, cal = {}, hdr = {} }) {
  const accent = cal.accent || '#c97d8a';
  const spark = (x, yy, r, o = 1) => <path key={x + '-' + yy} d={`M${x} ${yy - r}Q${x + r * 0.2} ${yy - r * 0.2} ${x + r} ${yy}Q${x + r * 0.2} ${yy + r * 0.2} ${x} ${yy + r}Q${x - r * 0.2} ${yy + r * 0.2} ${x - r} ${yy}Q${x - r * 0.2} ${yy - r * 0.2} ${x} ${yy - r}Z`} fill={accent} opacity={o} />;
  const section = (label, top, h) => (
    <g key={label}>
      <rect x="70" y={top} width="860" height={h} rx="26" fill="none" stroke={INK} strokeOpacity=".22" strokeWidth="2.5" strokeDasharray="2 10" strokeLinecap="round" />
      <rect x="96" y={top - 22} width={label.length * 17 + 40} height="44" rx="22" fill={accent} opacity=".9" />
      <text x={116} y={top + 9} fontFamily={FONT} fontSize="30" fill="#fffaf1">{label}</text>
    </g>
  );
  return (
    <g pointerEvents="none">
      {hdr[monthKey(y, m)] ? <ArtFit art={hdr[monthKey(y, m)]} x={150} y={80} w={700} h={175} align="middle" />
        : <text x="500" y="230" textAnchor="middle" fontFamily={FONT} fontSize="150" fill={accent}>{MONTHS[m]}</text>}
      {hdr[`y-${y}`] ? <ArtFit art={hdr[`y-${y}`]} x={380} y={258} w={240} h={56} align="middle" />
        : <text x="500" y="300" textAnchor="middle" fontFamily={FONT} fontSize="48" fill={INK} opacity=".5">{y}</text>}
      {spark(170, 110, 22, 0.8)}{spark(840, 150, 30)}{spark(880, 90, 14, 0.6)}{spark(130, 250, 12, 0.5)}
      <path d="M330 330Q500 360 670 330" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".6" />
      {section('goals', 420, 250)}
      {section('don’t forget', 730, 220)}
      {section('notes', 1000, 240)}
    </g>
  );
}

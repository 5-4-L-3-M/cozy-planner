import { useState } from 'react';

const INK = '#3d3121', MUTED = '#a8998a', DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const FONT = "'Patrick Hand', cursive";

export const MOODS = {
  happy: { fill: '#c8e0b4', face: 'M-6 3Q0 9 6 3' },
  calm: { fill: '#b9d8f0', face: 'M-5 4Q0 7 5 4' },
  meh: { fill: '#f3e6b4', face: 'M-5 5H5' },
  sad: { fill: '#d9c8ec', face: 'M-6 7Q0 1 6 7' },
  angry: { fill: '#f5b8b0', face: 'M-6 7Q0 2 6 7' },
  tired: { fill: '#e6dccb', face: 'M-4 5Q0 7 4 5' },
};
function Face({ mood, x, y, r = 15 }) {
  const m = MOODS[mood];
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={m.fill} stroke={INK} strokeWidth="1.6" />
      {mood === 'tired'
        ? <path d="M-8 -3H-3M3 -3H8" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        : mood === 'happy' || mood === 'calm'
          ? <path d="M-8 -2Q-5.5 -5 -3 -2M3 -2Q5.5 -5 8 -2" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          : <><circle cx="-5" cy="-3" r="1.6" fill={INK} /><circle cx="5" cy="-3" r="1.6" fill={INK} /></>}
      {mood === 'angry' && <path d="M-8 -8L-3 -6M8 -8L3 -6" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />}
      <path d={m.face} stroke={INK} strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </g>
  );
}
const drop = (x, full) => (
  <path key={x} d={`M${x} 10C${x} 10 ${x - 12} 26 ${x - 12} 34C${x - 12} 42 ${x - 6} 48 ${x} 48C${x + 6} 48 ${x + 12} 42 ${x + 12} 34C${x + 12} 26 ${x} 10 ${x} 10Z`}
    fill={full ? '#a7c4f2' : 'none'} stroke={full ? '#6e819c' : MUTED} strokeWidth="1.8" strokeLinejoin="round" />
);
const star = (cx, full) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 8 : 19, a = -Math.PI / 2 + (i * Math.PI) / 5; return `${cx + r * Math.cos(a)},${26 + r * Math.sin(a)}`; }).join(' ');
  return <polygon key={cx} points={pts} fill={full ? '#f2c45a' : 'none'} stroke={full ? '#8a6a2f' : INK} strokeWidth="1.8" strokeLinejoin="round" />;
};

const WATER_UNITS = [{ n: 250, u: 'ml' }, { n: 330, u: 'ml' }, { n: 500, u: 'ml' }, { n: 8, u: 'oz' }, { n: 12, u: 'oz' }, { n: 16, u: 'oz' }, { n: 1, u: 'cup' }];
function waterTotal(d) {
  const t = d.filled * d.unit, u = d.u || 'ml';
  if (u === 'ml') return t >= 1000 ? `${+(t / 1000).toFixed(2)} L` : `${t} ml`;
  if (u === 'cup') return `${t} cup${t === 1 ? '' : 's'}`;
  return `${t} oz`;
}

export const WIDGETS = {
  water: {
    label: 'Water',
    init: () => ({ type: 'water', count: 8, unit: 250, u: 'ml', filled: 0 }),
    size: (d) => [d.count * 40 + 110, 56],
    render: (d) => (
      <>
        {Array.from({ length: d.count }, (_, i) => drop(24 + i * 40, i < d.filled))}
        <rect x={d.count * 40 + 6} y="10" width="96" height="36" rx="18" fill="rgba(61,49,33,0.07)" />
        <text x={d.count * 40 + 54} y="35" textAnchor="middle" fontFamily={FONT} fontSize="19" fill={INK}>{waterTotal(d)}</text>
      </>
    ),
    // Tap a drop to fill up to it (tap the last filled one to empty it). Tap the amount to switch units.
    tap: (d, x) => {
      if (x > d.count * 40 + 4) { const i = (WATER_UNITS.findIndex((w) => w.n === d.unit && w.u === (d.u || 'ml')) + 1) % WATER_UNITS.length; return { ...d, unit: WATER_UNITS[i].n, u: WATER_UNITS[i].u }; }
      const i = Math.floor((x - 4) / 40); if (i < 0 || i >= d.count) return null; return { ...d, filled: d.filled === i + 1 ? i : i + 1 };
    },
  },
  stars: {
    label: 'Star rating',
    init: () => ({ type: 'stars', count: 5, value: 0 }),
    size: (d) => [d.count * 44 + 8, 52],
    render: (d) => Array.from({ length: d.count }, (_, i) => star(26 + i * 44, i < d.value)),
    tap: (d, x) => { const i = Math.floor((x - 4) / 44); if (i < 0 || i >= d.count) return null; return { ...d, value: d.value === i + 1 ? i : i + 1 }; },
  },
  goals: {
    label: 'Weekly goals',
    init: () => ({ type: 'goals', title: 'this week’s goals', goals: ['drink more water', 'finish that book', 'call mom'], done: {}, color: '#e8a9b6' }),
    size: (d) => [380, 92 + d.goals.length * 40 + (d.goals.length < 10 ? 36 : 0)],
    render: (d) => {
      const n = d.goals.length, k = d.goals.filter((_, i) => d.done[i]).length, c = d.color || '#e8a9b6';
      const bw = 200, fillW = n ? (bw * k) / n : 0, all = n && k === n, ad = n < 10 ? 36 : 0;
      return (
        <>
          <rect x="2" y="2" width="376" height={88 + n * 40 + ad} rx="22" fill={d.bg === undefined ? '#fffaf1' : 'none'} stroke={c} strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
          <text x="22" y="38" fontFamily={FONT} fontSize="26" fill={INK}>{d.title || 'this week’s goals'}</text>
          <path d="M352 18l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={all ? '#f2c45a' : c} opacity={all ? 1 : 0.7} />
          {d.goals.map((g, i) => {
            const y = 74 + i * 40, on = !!d.done[i];
            return (
              <g key={i}>
                <path d={`M34 ${y + 8}C21 ${y} 20 ${y - 9} 27 ${y - 11}C31 ${y - 12} 33 ${y - 9} 34 ${y - 7}C35 ${y - 9} 37 ${y - 12} 41 ${y - 11}C48 ${y - 9} 47 ${y} 34 ${y + 8}Z`}
                  fill={on ? c : 'none'} stroke={on ? INK : MUTED} strokeWidth="1.7" strokeLinejoin="round" />
                {g ? <text x="58" y={y + 5} fontFamily={FONT} fontSize="21" fill={INK} opacity={on ? 0.55 : 1}
                  {...(g.length * 9.4 > 300 ? { textLength: 300, lengthAdjust: 'spacingAndGlyphs' } : {})}>{g.length > 48 ? g.slice(0, 46) + '…' : g}</text>
                  : <path d={`M58 ${y + 8}H350`} stroke={MUTED} strokeWidth="1.2" strokeDasharray="1 5" strokeLinecap="round" opacity=".7" />}
                {on && g && <path d={`M56 ${y - 1}Q${60 + Math.min(150, g.length * 4.5)} ${y - 4} ${Math.min(360, 64 + g.length * 9)} ${y}`} stroke={c} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".8" />}
              </g>
            );
          })}
          {ad > 0 && <text x="26" y={79 + n * 40} fontFamily={FONT} fontSize="19" fill={MUTED}>+ add a goal</text>}
          <rect x="22" y={66 + n * 40 + ad} width={bw} height="12" rx="6" fill="none" stroke={MUTED} strokeWidth="1.5" />
          {fillW > 0 && <rect x="22" y={66 + n * 40 + ad} width={Math.max(12, fillW)} height="12" rx="6" fill={c} />}
          <text x={bw + 34} y={77 + n * 40 + ad} fontFamily={FONT} fontSize="18" fill={INK}>{all ? 'all done ✿' : `${k} of ${n}`}</text>
        </>
      );
    },
    tap: (d, x, y) => {
      // The heart checks a goal off; tapping the words types on them; "+ add a goal" adds a row.
      const n = d.goals.length, i = Math.floor((y - 54) / 40);
      if (i === n && n < 10 && x < 300) return { editGoal: n };
      if (i < 0 || i >= n || x > 370) return null;
      if (x > 56) return { editGoal: i };
      const done = { ...d.done }; if (done[i]) delete done[i]; else done[i] = true;
      return { ...d, done };
    },
  },
  unit: {
    label: 'Unit tracker',
    init: () => ({ type: 'unit', unit: '', property: '', week: '', color: '#a7c4f2', prio: 0, cells: {},
      cols: ['Quote #', 'Sharepoint', 'Cabinet layout', 'Counter layout', 'Counters sent to M&W', 'Manuf. list & txt file', 'Item list', 'M&W quote rcv’d', 'Contract (waiting on M&W)', 'Contract completed', 'Sent to property'],
      textCols: [0] }),
    size: (d) => [380, oneGeo(d).H],
    render: (d) => {
      const g = oneGeo(d), col = d.color || '#a7c4f2', n = g.checks.length, k = g.checks.filter((x) => d.cells?.[x.c]).length;
      const pw = Math.max(110, 24 + (d.unit || 'unit #').length * 10);
      return (
        <>
          <rect x="4" y="4" width="372" height={g.H - 8} rx="20" fill={d.bg === undefined ? '#fffaf1' : 'none'} stroke={col} strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
          <rect x="18" y="16" width={pw} height="30" rx="15" fill={color(col, 0.55)} />
          <text x="32" y="37" fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="16" fill={d.unit ? INK : MUTED}>{d.unit || 'unit #'}</text>
          <text x={pw + 30} y="40" fontFamily="'Dancing Script', cursive" fontWeight="600" fontSize="21" fill={d.property ? color(col, 1, 0.62) : MUTED} opacity={d.property ? 1 : 0.7}
            transform={`rotate(-4 ${pw + 30} 34)`} {...((d.property || 'property').length * 9.5 > 290 - pw ? { textLength: 290 - pw, lengthAdjust: 'spacingAndGlyphs' } : {})}>{d.property || 'property'}</text>
          <g transform="translate(350 31)">
            <circle r="11" fill={PRIO[d.prio || 0] || '#fff'} stroke={d.prio ? 'none' : MUTED} strokeWidth="1.4" strokeDasharray={d.prio ? '' : '2 3'} />
            {d.prio > 0 && <text y="5" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="12" fill={INK}>{'!'.repeat(d.prio)}</text>}
          </g>
          {d.week && <text x="20" y="62" fontFamily="Nunito, sans-serif" fontWeight="700" fontSize="11" fill={MUTED}>{d.week}</text>}
          {g.typed.map((t) => (
            <g key={'t' + t.c}>
              <text x="22" y={t.y + 18} fontFamily="Nunito, sans-serif" fontWeight="700" fontSize="12" fill={MUTED}>{d.cols[t.c].toLowerCase()}</text>
              <path d={`M${22 + Math.min(110, d.cols[t.c].length * 7 + 10)} ${t.y + 21}H354`} stroke={MUTED} strokeWidth="1.2" strokeDasharray="1 5" strokeLinecap="round" />
              {d.cells?.[t.c] && <text x={26 + Math.min(110, d.cols[t.c].length * 7 + 10)} y={t.y + 18} fontFamily={FONT} fontSize="18" fill={INK}>{String(d.cells[t.c]).slice(0, 26)}</text>}
            </g>
          ))}
          {g.checks.map((x) => {
            const on = !!d.cells?.[x.c], lbl = d.cols[x.c];
            return (
              <g key={'k' + x.c}>
                <rect x={x.x} y={x.y + 5} width="16" height="16" rx="5" fill={on ? col : '#fff'} stroke={on ? col : MUTED} strokeWidth="1.5" />
                {on && <path d={`M${x.x + 4} ${x.y + 13}l3 3l6 -7`} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
                <text x={x.x + 22} y={x.y + 18} fontFamily={FONT} fontSize="15" fill={INK} opacity={on ? 0.5 : 1}
                  {...(lbl.length * 6.6 > 138 ? { textLength: 138, lengthAdjust: 'spacingAndGlyphs' } : {})}>{lbl}</text>
              </g>
            );
          })}
          <rect x="22" y={g.H - 30} width="250" height="8" rx="4" fill={color(col, 0.25)} />
          {k > 0 && <rect x="22" y={g.H - 30} width={Math.max(8, (250 * k) / Math.max(1, n))} height="8" rx="4" fill={col} />}
          <text x="282" y={g.H - 22} fontFamily={FONT} fontSize="15" fill={INK}>{k === n && n ? 'all done ♡' : `${k} of ${n}`}</text>
          <g transform={`translate(352 ${g.H - 26})`}><circle r="12" fill={color(col, 0.3)} /><text y="4" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="14" fill={INK}>⋯</text></g>
        </>
      );
    },
    tap: (d, x, y) => {
      const g = oneGeo(d), pw = Math.max(110, 24 + (d.unit || 'unit #').length * 10);
      if (y < 54) {
        if (x > 330) return { ...d, prio: ((d.prio || 0) + 1) % PRIO.length };
        if (x < pw + 22) return { editText: WIDGETS.unit.box(d, 'unit') };
        return { editText: WIDGETS.unit.box(d, 'property') };
      }
      const t = g.typed.find((q) => y >= q.y && y < q.y + 26);
      if (t) return { editText: { key: 'cell:' + t.c, label: d.cols[t.c], x: 20 + Math.min(110, d.cols[t.c].length * 7 + 10), y: t.y + 1, w: 220, h: 26, value: d.cells?.[t.c] || '', font: 17 } };
      const ch = g.checks.find((q) => y >= q.y && y < q.y + 26 && x >= q.x - 6 && x < q.x + 170);
      if (ch) return { ...d, cells: { ...d.cells, [ch.c]: !d.cells?.[ch.c] } };
      if (x > 330 && y > g.H - 44) return { openEditor: true };
      return null;
    },
    // Typing boxes for the card's header; unit leads straight into property (and property into quote #).
    box: (d, key) => {
      const pw = Math.max(110, 24 + (d.unit || 'unit #').length * 10);
      if (key === 'unit') return { key, label: 'Unit #', placeholder: 'e.g. 10020-2A', x: 14, y: 14, w: 200, h: 34, value: d.unit || '', font: 16, next: 'property' };
      if (key === 'property') return { key, label: 'Property', placeholder: 'e.g. Liberty Mills', x: pw + 24, y: 14, w: 300 - pw, h: 34, value: d.property || '', font: 18, next: (d.textCols || []).length ? 'cell:' + d.textCols[0] : null };
      const c = +key.split(':')[1], t = oneGeo(d).typed.find((q) => q.c === c);
      return t ? { key, label: d.cols[c], x: 20 + Math.min(110, d.cols[c].length * 7 + 10), y: t.y + 1, w: 220, h: 26, value: d.cells?.[c] || '', font: 17 } : null;
    },
    setText: (d, key, v) => {
      if (key === 'unit') return { ...d, unit: v };
      if (key === 'property') return { ...d, property: v };
      if (key.startsWith('cell:')) return { ...d, cells: { ...d.cells, [key.slice(5)]: v } };
      return d;
    },
  },
  table: {
    label: 'Unit tracker (list)',
    hidden: true,
    init: () => ({ type: 'table', title: 'week of …', head: '#e8a9b6',
      cols: ['Quote #', 'Sharepoint', 'Cabinet layout', 'Counter layout', 'Counters sent to M&W', 'Manuf. list & txt file', 'Item list', 'M&W quote rcv’d', 'Contract (waiting on M&W)', 'Contract completed', 'Sent to property'],
      textCols: [0],
      rows: [] }),
    size: (d) => { const g = unitGeo(d); return [380, g.H]; },
    // Where "+ add a unit" sits, as a typing box (Enter adds the unit and opens the next one, like the goals list).
    addBox: (d) => ({ key: 'add', x: 14, y: unitGeo(d).addY + 2, w: 260, h: 30, value: '', font: 17, chain: true }),
    render: (d) => {
      const g = unitGeo(d);
      return (
        <>
          <text x="14" y="30" fontFamily={FONT} fontSize="26" fill={INK}>{d.title || 'week of …'}</text>
          <path d="M356 18l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={d.head || '#e8a9b6'} opacity=".8" />
          {g.cards.map((c) => {
            const r = d.rows[c.i], col = r.color || '#a7c4f2', n = c.checks.length, k = c.checks.filter((x) => r.cells?.[x.c]).length;
            return (
              <g key={c.i}>
                <rect x="6" y={c.y} width="368" height={c.h} rx="18" fill={d.bg === undefined ? '#fffaf1' : 'none'} stroke={col} strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
                <rect x="18" y={c.y + 12} width={Math.max(96, 22 + (r.unit || 'name this unit').length * 9.5)} height="28" rx="14" fill={color(col, 0.55)} />
                <text x="31" y={c.y + 32} fontFamily="Nunito, sans-serif" fontWeight="800" fontSize="15" fill={r.unit ? INK : MUTED}>{r.unit || 'name this unit'}</text>
                <g transform={`translate(330 ${c.y + 26})`}>
                  <circle r="11" fill={PRIO[r.prio || 0] || '#fff'} stroke={r.prio ? 'none' : MUTED} strokeWidth="1.4" strokeDasharray={r.prio ? '' : '2 3'} />
                  {r.prio > 0 && <text y="5" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="12" fill={INK}>{'!'.repeat(r.prio)}</text>}
                </g>
                {c.typed.map((t) => (
                  <g key={'t' + t.c}>
                    <text x="22" y={t.y + 18} fontFamily="Nunito, sans-serif" fontWeight="700" fontSize="12" fill={MUTED}>{d.cols[t.c].toLowerCase()}</text>
                    <path d={`M${22 + Math.min(110, d.cols[t.c].length * 7 + 10)} ${t.y + 21}H350`} stroke={MUTED} strokeWidth="1.2" strokeDasharray="1 5" strokeLinecap="round" />
                    {r.cells?.[t.c] && <text x={26 + Math.min(110, d.cols[t.c].length * 7 + 10)} y={t.y + 18} fontFamily={FONT} fontSize="18" fill={INK}>{String(r.cells[t.c]).slice(0, 26)}</text>}
                  </g>
                ))}
                {c.checks.map((x) => {
                  const on = !!r.cells?.[x.c], lbl = d.cols[x.c];
                  return (
                    <g key={'k' + x.c}>
                      <rect x={x.x} y={x.y + 5} width="16" height="16" rx="5" fill={on ? col : '#fff'} stroke={on ? col : MUTED} strokeWidth="1.5" />
                      {on && <path d={`M${x.x + 4} ${x.y + 13}l3 3l6 -7`} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}
                      <text x={x.x + 22} y={x.y + 18} fontFamily={FONT} fontSize="15" fill={INK} opacity={on ? 0.5 : 1}
                        {...(lbl.length * 6.6 > 138 ? { textLength: 138, lengthAdjust: 'spacingAndGlyphs' } : {})}>{lbl}</text>
                    </g>
                  );
                })}
                <rect x="22" y={c.y + c.h - 22} width="250" height="8" rx="4" fill={color(col, 0.25)} />
                {k > 0 && <rect x="22" y={c.y + c.h - 22} width={Math.max(8, (250 * k) / Math.max(1, n))} height="8" rx="4" fill={col} />}
                <text x="282" y={c.y + c.h - 14} fontFamily={FONT} fontSize="15" fill={INK}>{k === n && n ? 'all done ♡' : `${k} of ${n}`}</text>
              </g>
            );
          })}
          {d.rows.length < 30 && <text x="18" y={g.addY + 22} fontFamily={FONT} fontSize="19" fill={MUTED}>{d.rows.length ? '+ add a unit' : '+ add a unit (type it, press enter, keep going)'}</text>}
        </>
      );
    },
    // The unit name, title and typed lines type right on the page; the dot cycles priority; steps check off.
    tap: (d, x, y) => {
      const g = unitGeo(d);
      if (y < 44) return { editText: { key: 'title', x: 10, y: 6, w: 330, h: 32, value: d.title || '', font: 24 } };
      if (y >= g.addY && y < g.addY + 34) return d.rows.length >= 30 ? null : { editText: WIDGETS.table.addBox(d) };
      const c = g.cards.find((q) => y >= q.y && y < q.y + q.h); if (!c) return null;
      const r = d.rows[c.i];
      if (y < c.y + 46) {
        if (x > 300) return { ...d, rows: d.rows.map((q, k) => (k === c.i ? { ...q, prio: ((q.prio || 0) + 1) % PRIO.length } : q)) };
        return { editText: { key: 'unit:' + c.i, x: 18, y: c.y + 10, w: 220, h: 32, value: r.unit || '', font: 15 } };
      }
      const t = c.typed.find((q) => y >= q.y && y < q.y + 26);
      if (t) return { editText: { key: `cell:${c.i}:${t.c}`, x: 20 + Math.min(110, d.cols[t.c].length * 7 + 10), y: t.y + 1, w: 220, h: 26, value: r.cells?.[t.c] || '', font: 17 } };
      const ch = c.checks.find((q) => y >= q.y && y < q.y + 26 && x >= q.x - 6 && x < q.x + 170);
      if (ch) return { ...d, rows: d.rows.map((q, k) => (k === c.i ? { ...q, cells: { ...q.cells, [ch.c]: !q.cells?.[ch.c] } } : q)) };
      return null;
    },
    setText: (d, key, v) => {
      const [kind, a, b] = key.split(':');
      if (kind === 'title') return { ...d, title: v };
      if (kind === 'add') return v ? { ...d, rows: [...d.rows, { unit: v, color: d.rows[d.rows.length - 1]?.color || '#a7c4f2', prio: 0, cells: {} }] } : d;
      if (kind === 'unit') return v ? { ...d, rows: d.rows.map((r, k) => (k === +a ? { ...r, unit: v } : r)) } : { ...d, rows: d.rows.filter((_, k) => k !== +a) };
      if (kind === 'cell') return { ...d, rows: d.rows.map((r, k) => (k === +a ? { ...r, cells: { ...r.cells, [b]: v } } : r)) };
      return d;
    },
  },
  habits: {
    label: 'Habit tracker',
    init: () => ({ type: 'habits', rows: ['read', 'walk', 'stretch'], checks: {} }),
    size: (d) => [370, 46 + d.rows.length * 32],
    render: (d) => (
      <>
        {DAYS.map((l, i) => <text key={i} x={140 + i * 32} y="26" textAnchor="middle" fontFamily={FONT} fontSize="20" fill={INK}>{l}</text>)}
        {d.rows.map((name, r) => (
          <g key={r}>
            <text x="8" y={66 + r * 32} fontFamily={FONT} fontSize="20" fill={INK}>{name}</text>
            {DAYS.map((_, i) => d.checks[`${r}-${i}`]
              ? <circle key={i} cx={140 + i * 32} cy={60 + r * 32} r="7" fill={INK} opacity=".7" />
              : <path key={i} d={`M${130 + i * 32} ${62 + r * 32}Q${140 + i * 32} ${57 + r * 32} ${150 + i * 32} ${62 + r * 32}`} stroke={MUTED} strokeWidth="1.6" fill="none" strokeLinecap="round" />)}
          </g>
        ))}
      </>
    ),
    tap: (d, x, y) => {
      const c = Math.round((x - 140) / 32), r = Math.floor((y - 44) / 32);
      if (c < 0 || c > 6 || r < 0 || r >= d.rows.length) return null;
      const k = `${r}-${c}`, checks = { ...d.checks };
      if (checks[k]) delete checks[k]; else checks[k] = true;
      return { ...d, checks };
    },
  },
  mood: {
    label: 'Mood tracker',
    init: () => ({ type: 'mood', moods: {} }),
    size: () => [340, 92],
    render: (d) => DAYS.map((l, i) => (
      <g key={i}>
        <text x={30 + i * 46} y="24" textAnchor="middle" fontFamily={FONT} fontSize="20" fill={INK}>{l}</text>
        {d.moods[i] ? <Face mood={d.moods[i]} x={30 + i * 46} y={62} />
          : <path d={`M${20 + i * 46} 64Q${30 + i * 46} 58 ${40 + i * 46} 64`} stroke={MUTED} strokeWidth="1.6" fill="none" strokeLinecap="round" />}
      </g>
    )),
    tap: (d, x) => { const i = Math.round((x - 30) / 46); if (i < 0 || i > 6) return null; return { pickMood: i }; },
  },
  time: {
    label: 'Time tracker',
    init: () => ({ type: 'time', max: 12, active: 0, cats: [{ name: 'screen', color: '#d89c7e' }, { name: 'sleep', color: '#a7c4f2' }], vals: {} }),
    size: () => [430, 310],
    render: (d) => {
      const x0 = 56, x1 = 410, y0 = 60, y1 = 270, cw = (x1 - x0) / 7, bw = Math.min(26, (cw - 8) / d.cats.length);
      return (
        <>
          {d.cats.map((c, i) => (
            <g key={i} transform={`translate(${x1 - (d.cats.length - i) * 96} 24)`}>
              <circle r="8" fill={c.color} stroke={i === d.active ? INK : 'none'} strokeWidth="2" />
              <text x="14" y="7" fontFamily={FONT} fontSize="19" fill={INK} fontWeight={i === d.active ? 700 : 400}>{c.name}</text>
            </g>
          ))}
          {[0, 1, 2, 3, 4].map((k) => {
            const y = y1 - ((y1 - y0) * k) / 4, v = (d.max * k) / 4;
            return (
              <g key={k}>
                {k > 0 && <path d={`M${x0} ${y}H${x1}`} stroke={MUTED} strokeDasharray="4 4" strokeWidth="1" />}
                {k > 0 && <text x={x0 - 10} y={y + 5} textAnchor="end" fontFamily={FONT} fontSize="16" fill={INK}>{Number.isInteger(v) ? v : v.toFixed(1)}</text>}
              </g>
            );
          })}
          <path d={`M${x0} ${y0 - 6}V${y1}H${x1}`} stroke={INK} strokeWidth="1.6" fill="none" />
          {DAYS.map((l, i) => (
            <g key={i}>
              <text x={x0 + cw * i + cw / 2} y={y1 + 24} textAnchor="middle" fontFamily={FONT} fontSize="18" fill={INK}>{l}</text>
              {d.cats.map((c, ci) => {
                const v = d.vals[`${ci}-${i}`] || 0; if (!v) return null;
                const h = ((y1 - y0) * v) / d.max, bx = x0 + cw * i + cw / 2 - (bw * d.cats.length) / 2 + ci * bw;
                return <rect key={ci} x={bx + 1} y={y1 - h} width={bw - 2} height={h} rx="3" fill={c.color} />;
              })}
            </g>
          ))}
        </>
      );
    },
    tap: (d, x, y) => {
      const x0 = 56, x1 = 410, y0 = 60, y1 = 270, cw = (x1 - x0) / 7;
      if (y < 44) {
        const i = d.cats.findIndex((_, k) => x >= x1 - (d.cats.length - k) * 96 - 10 && x < x1 - (d.cats.length - k - 1) * 96 - 10);
        return i >= 0 ? { ...d, active: i } : null;
      }
      if (x < x0 || x > x1 || y > y1 + 10 || y < y0 - 10) return null;
      const day = Math.min(6, Math.floor((x - x0) / cw));
      const v = Math.max(0, Math.min(d.max, Math.round((((y1 - Math.min(y, y1)) / (y1 - y0)) * d.max) * 2) / 2));
      const k = `${d.active}-${day}`, vals = { ...d.vals };
      if (!v || vals[k] === v) delete vals[k]; else vals[k] = v;
      return { ...d, vals };
    },
  },
};

// Same widget, data changed: keep its width, let its height follow the content.
export function refit(it, data) {
  const W = WIDGETS[data.type]; const k = it.w / W.size(it.data)[0]; const [dw, dh] = W.size(data);
  return { ...it, data, w: Math.round(dw * k), h: Math.round(dh * k) };
}


// Unit tracker helpers.
const PRIO = [null, '#b9dca0', '#f3d98a', '#f2a7a7'];
// color(hex, a): a < 1 lightens toward white; dark < 1 deepens it (for readable text in the card's color).
const color = (hex, a, dark = 1) => { const n = parseInt(hex.slice(1), 16); const m = (v) => Math.round((v + (255 - v) * (1 - a)) * dark); return `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`; };
function oneGeo(d) {
  const tc = new Set(d.textCols || []), typed = [], checks = []; let y = d.week ? 70 : 60;
  d.cols.forEach((_, c) => { if (tc.has(c)) { typed.push({ c, y }); y += 26; } });
  let k = 0;
  d.cols.forEach((_, c) => { if (!tc.has(c)) { checks.push({ c, x: k % 2 ? 196 : 22, y: y + Math.floor(k / 2) * 26 }); k++; } });
  return { typed, checks, H: y + Math.ceil(k / 2) * 26 + 46 };
}
// One card per unit: name + priority, typed lines (like quote #), then the steps in two columns.
function unitGeo(d) {
  const tc = new Set(d.textCols || []), cards = []; let y = 48;
  d.rows.forEach((_, i) => {
    const typed = [], checks = []; let yy = y + 48;
    d.cols.forEach((_, c) => { if (tc.has(c)) { typed.push({ c, y: yy }); yy += 26; } });
    let k = 0;
    d.cols.forEach((_, c) => { if (!tc.has(c)) { checks.push({ c, x: k % 2 ? 196 : 22, y: yy + Math.floor(k / 2) * 26 }); k++; } });
    const h = yy - y + Math.ceil(k / 2) * 26 + 34;
    cards.push({ i, y, h, typed, checks });
    y += h + 12;
  });
  return { cards, addY: y, H: y + (d.rows.length < 30 ? 36 : 4) };
}

export function WidgetView({ data, w, h }) {
  const W = WIDGETS[data.type]; if (!W) return null;
  const [dw, dh] = W.size(data);
  // Optional card behind any tracker ('none' = transparent; unset = the tracker's own look).
  const bg = data.bg && data.bg !== 'none' ? data.bg : null;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${dw} ${dh}`} preserveAspectRatio="xMinYMin meet" overflow="visible">
      {bg && <rect x="-8" y="-8" width={dw + 16} height={dh + 16} rx="18" fill={bg} stroke="rgba(61,49,33,.12)" strokeWidth="1.5" />}
      {W.render(data)}
    </svg>
  );
}

// Map a page point to the widget's own drawing coordinates.
export function widgetLocal(it, p) {
  const W = WIDGETS[it.data.type]; const [dw, dh] = W.size(it.data);
  const cx = it.x + it.w / 2, cy = it.y + it.h / 2, r = (-(it.rot || 0) * Math.PI) / 180;
  const dx = p[0] - cx, dy = p[1] - cy;
  const lx = dx * Math.cos(r) - dy * Math.sin(r) + it.w / 2, ly = dx * Math.sin(r) + dy * Math.cos(r) + it.h / 2;
  const k = Math.min(it.w / dw, it.h / dh);
  return [lx / k, ly / k];
}

export function WidgetEditor({ it, onSave, onClose, onDelete }) {
  const [d, setD] = useState(it.data);
  const save = () => {
    const [dw, dh] = WIDGETS[d.type].size(d);
    const k = it.w / WIDGETS[it.data.type].size(it.data)[0];
    onSave({ ...it, data: d, w: Math.round(dw * k), h: Math.round(dh * k) });
    onClose();
  };
  const num = (key, min, max, label) => (
    <label className="slider">{label} <span>{d[key]}</span>
      <input type="range" min={min} max={max} value={d[key]} onChange={(e) => setD({ ...d, [key]: +e.target.value })} />
    </label>
  );
  return (
    <>
      <div className="sheet-bg" />
      <section className="sheet" aria-label="Edit tracker">
        <div className="ptitle hand">{WIDGETS[d.type].label}</div>
        <div className="ptitle small" style={{ marginTop: 8 }}>BACKGROUND</div>
        <div className="swatches bgpick" style={{ marginTop: 6, marginBottom: 6 }}>
          <button className={'sw auto' + (d.bg === undefined ? ' on' : '')} onClick={() => { const n = { ...d }; delete n.bg; setD(n); }} aria-label="Default background">Auto</button>
          <button className={'sw clear' + (d.bg === 'none' ? ' on' : '')} onClick={() => setD({ ...d, bg: 'none' })} aria-label="Transparent background" title="Transparent" />
          {['#fffaf1', '#fbe4e9', '#e6eef6', '#e4ecdb', '#fbf0cf', '#ece4f0', '#f6dfd6', '#3d3121'].map((c) => (
            <button key={c} className={'sw' + (d.bg === c ? ' on' : '')} style={{ background: c }} onClick={() => setD({ ...d, bg: c })} aria-label={'Background ' + c} />
          ))}
          <label className="sw custom" title="Custom background"><input type="color" value={d.bg && d.bg !== 'none' ? d.bg : '#fffaf1'} onChange={(e) => setD({ ...d, bg: e.target.value })} aria-label="Custom background" /></label>
        </div>
        {d.type === 'water' && <>{num('count', 3, 12, 'Glasses')}</>}
        {d.type === 'stars' && num('count', 3, 10, 'Stars')}
        {d.type === 'goals' && (
          <div className="wlist">
            <label className="field">Title<input value={d.title || ''} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
            {d.goals.map((g, i) => (
              <div key={i} className="wrow">
                <input value={g} placeholder="blank line to write on" onChange={(e) => setD({ ...d, goals: d.goals.map((x, j) => (j === i ? e.target.value : x)) })} aria-label="Goal" />
                <button className="mini danger" onClick={() => { const done = {}; d.goals.forEach((_, j) => { if (j !== i && d.done[j]) done[j > i ? j - 1 : j] = true; }); setD({ ...d, goals: d.goals.filter((_, j) => j !== i), done }); }} aria-label="Remove goal">×</button>
              </div>
            ))}
            {d.goals.length < 10 && <button className="mini" onClick={() => setD({ ...d, goals: [...d.goals, ''] })}>+ Goal</button>}
            <div className="swatches" style={{ marginTop: 10 }}>
              {['#e8a9b6', '#a7c4f2', '#98a487', '#f3d98a', '#c4b2d6', '#cf826d', '#7fb3b0'].map((c) => <button key={c} className={'sw' + (d.color === c ? ' on' : '')} style={{ background: c }} aria-label={'Accent ' + c} onClick={() => setD({ ...d, color: c })} />)}
            </div>
          </div>
        )}
        {d.type === 'unit' && (
          <div className="wlist">
            <label className="field">Unit<input value={d.unit || ''} onChange={(e) => setD({ ...d, unit: e.target.value })} /></label>
            <label className="field">Property<input value={d.property || ''} onChange={(e) => setD({ ...d, property: e.target.value })} /></label>
            <label className="field">Week<input value={d.week || ''} placeholder="(optional)" onChange={(e) => setD({ ...d, week: e.target.value })} /></label>
            <div className="ptitle small">CARD COLOR</div>
            <div className="swatches">
              {['#a7c4f2', '#f0a6cf', '#b9dca0', '#f3d98a', '#c4b2d6', '#f2a7a7', '#9fd3cf', '#e8b8a0'].map((c) => <button key={c} className={'sw' + (d.color === c ? ' on' : '')} style={{ background: c }} aria-label={'Card color ' + c} onClick={() => setD({ ...d, color: c })} />)}
              <label className="sw custom" title="Custom color"><input type="color" value={d.color || '#a7c4f2'} onChange={(e) => setD({ ...d, color: e.target.value })} aria-label="Custom card color" /></label>
            </div>
            <div className="ptitle small" style={{ marginTop: 10 }}>STEPS <small>(“Aa” = a line you type on, like quote #; otherwise it’s a checkbox)</small></div>
            {d.cols.map((c, i) => {
              const remap = (fn) => Object.fromEntries(Object.entries(d.cells || {}).map(([k, v]) => [fn(+k), v]).filter(([k]) => k !== null && k >= 0));
              return (
                <div key={i} className="wrow">
                  <input value={c} onChange={(e) => setD({ ...d, cols: d.cols.map((x, j) => (j === i ? e.target.value : x)) })} aria-label="Step name" />
                  <button className={'mini' + ((d.textCols || []).includes(i) ? ' on' : '')} title="Typed line" onClick={() => setD({ ...d, textCols: (d.textCols || []).includes(i) ? d.textCols.filter((x) => x !== i) : [...(d.textCols || []), i] })}>Aa</button>
                  {i > 0 && <button className="mini" aria-label="Move up" onClick={() => { const cols = [...d.cols]; [cols[i - 1], cols[i]] = [cols[i], cols[i - 1]]; const sw = (x) => (x === i ? i - 1 : x === i - 1 ? i : x); setD({ ...d, cols, textCols: (d.textCols || []).map(sw), cells: remap(sw) }); }}>↑</button>}
                  <button className="mini danger" aria-label="Remove step" onClick={() => { const sh = (x) => (x === i ? -1 : x > i ? x - 1 : x); setD({ ...d, cols: d.cols.filter((_, j) => j !== i), textCols: (d.textCols || []).filter((x) => x !== i).map(sh), cells: remap(sh) }); }}>×</button>
                </div>
              );
            })}
            {d.cols.length < 20 && <button className="mini" onClick={() => setD({ ...d, cols: [...d.cols, 'New step'] })}>+ Step</button>}
          </div>
        )}
        {d.type === 'table' && (
          <div className="wlist">
            <label className="field">Title<input value={d.title || ''} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
            <div className="ptitle small">ACCENT</div>
            <div className="swatches">
              {['#e8a9b6', '#a7c4f2', '#b9dca0', '#f3d98a', '#c4b2d6', '#e8b8a0', '#9fd3cf'].map((c) => <button key={c} className={'sw' + (d.head === c ? ' on' : '')} style={{ background: c }} aria-label={'Accent ' + c} onClick={() => setD({ ...d, head: c })} />)}
            </div>
            <div className="ptitle small" style={{ marginTop: 10 }}>UNITS <small>(tap the color to change it)</small></div>
            {d.rows.map((r, i) => (
              <div key={i} className="wrow">
                <button className="sw" style={{ background: r.color, width: 30, height: 30, flex: 'none' }} aria-label="Row color"
                  onClick={() => { const C = ['#a7c4f2', '#f0a6cf', '#b9dca0', '#f3d98a', '#c4b2d6', '#f2a7a7', '#9fd3cf']; setD({ ...d, rows: d.rows.map((x, j) => (j === i ? { ...x, color: C[(C.indexOf(x.color) + 1) % C.length] } : x)) }); }} />
                <input value={r.unit} placeholder="unit" onChange={(e) => setD({ ...d, rows: d.rows.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)) })} aria-label="Unit" />
                <button className="mini danger" onClick={() => setD({ ...d, rows: d.rows.filter((_, j) => j !== i) })} aria-label="Remove row">×</button>
              </div>
            ))}
            <button className="mini" onClick={() => setD({ ...d, rows: [...d.rows, { unit: '', color: d.rows[d.rows.length - 1]?.color || '#a7c4f2', prio: 0, cells: {} }] })}>+ Unit</button>
            <div className="ptitle small" style={{ marginTop: 10 }}>STEPS <small>(“Aa” = a line you type on, like quote #; otherwise it’s a checkbox)</small></div>
            {d.cols.map((c, i) => (
              <div key={i} className="wrow">
                <input value={c} onChange={(e) => setD({ ...d, cols: d.cols.map((x, j) => (j === i ? e.target.value : x)) })} aria-label="Column name" />
                <button className={'mini' + ((d.textCols || []).includes(i) ? ' on' : '')} title="Typed column" onClick={() => setD({ ...d, textCols: (d.textCols || []).includes(i) ? d.textCols.filter((x) => x !== i) : [...(d.textCols || []), i] })}>Aa</button>
                {i > 0 && <button className="mini" aria-label="Move left" onClick={() => { const cols = [...d.cols]; [cols[i - 1], cols[i]] = [cols[i], cols[i - 1]]; const sw = (x) => (x === i ? i - 1 : x === i - 1 ? i : x); setD({ ...d, cols, textCols: (d.textCols || []).map(sw), rows: d.rows.map((r) => ({ ...r, cells: Object.fromEntries(Object.entries(r.cells || {}).map(([k, v]) => [sw(+k), v])) })) }); }}>←</button>}
                <button className="mini danger" aria-label="Remove column" onClick={() => { const sh = (x) => (x > i ? x - 1 : x); setD({ ...d, cols: d.cols.filter((_, j) => j !== i), textCols: (d.textCols || []).filter((x) => x !== i).map(sh), rows: d.rows.map((r) => ({ ...r, cells: Object.fromEntries(Object.entries(r.cells || {}).filter(([k]) => +k !== i).map(([k, v]) => [sh(+k), v])) })) }); }}>×</button>
              </div>
            ))}
            {d.cols.length < 16 && <button className="mini" onClick={() => setD({ ...d, cols: [...d.cols, 'New step'] })}>+ Step</button>}
          </div>
        )}
        {d.type === 'habits' && (
          <div className="wlist">
            {d.rows.map((r, i) => (
              <div key={i} className="wrow">
                <input value={r} onChange={(e) => setD({ ...d, rows: d.rows.map((x, j) => (j === i ? e.target.value : x)) })} aria-label="Habit name" />
                <button className="mini danger" onClick={() => setD({ ...d, rows: d.rows.filter((_, j) => j !== i), checks: {} })} aria-label="Remove habit">×</button>
              </div>
            ))}
            <button className="mini" onClick={() => setD({ ...d, rows: [...d.rows, 'new habit'] })}>+ Habit</button>
          </div>
        )}
        {d.type === 'time' && (
          <div className="wlist">
            {num('max', 4, 24, 'Top of chart (hours)')}
            {d.cats.map((c, i) => (
              <div key={i} className="wrow">
                <label className="sw custom" style={{ background: c.color, width: 32, height: 32 }}>
                  <input type="color" value={c.color} onChange={(e) => setD({ ...d, cats: d.cats.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })} aria-label="Category color" />
                </label>
                <input value={c.name} onChange={(e) => setD({ ...d, cats: d.cats.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} aria-label="Category name" />
                {d.cats.length > 1 && <button className="mini danger" onClick={() => setD({ ...d, cats: d.cats.filter((_, j) => j !== i), active: 0, vals: {} })} aria-label="Remove category">×</button>}
              </div>
            ))}
            {d.cats.length < 4 && <button className="mini" onClick={() => setD({ ...d, cats: [...d.cats, { name: 'new', color: '#98a487' }] })}>+ Category</button>}
          </div>
        )}
        {d.type === 'mood' && <p className="hint">Tap a day on the tracker to pick a mood.</p>}
        <div className="prow" style={{ marginTop: 14 }}>
          {onDelete && <button className="mini danger" onClick={onDelete}>Delete tracker</button>}
          <button className="mini" onClick={onClose} style={{ marginLeft: 'auto' }}>Cancel</button>
          <button className="btn primary" onClick={save}>Done</button>
        </div>
      </section>
    </>
  );
}

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const SHORT = MONTHS.map((m) => m.slice(0, 3));
export const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const weekStart = (s) => { const d = parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d); };
export const today = () => iso(new Date());

export function isoWeek(s) {
  const d = parse(s);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

export function weekLabel(ws) {
  const a = parse(ws), b = parse(addDays(ws, 6));
  if (a.getMonth() === b.getMonth()) return `${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  return `${SHORT[a.getMonth()]} / ${SHORT[b.getMonth()]} ${b.getFullYear()}`;
}

export function weekRange(ws) {
  const a = parse(ws), b = parse(addDays(ws, 6));
  return `${SHORT[a.getMonth()]} ${a.getDate()} – ${a.getMonth() === b.getMonth() ? '' : SHORT[b.getMonth()] + ' '}${b.getDate()}`;
}

// Weeks (Mon starts) that touch a given month
export function monthWeeks(year, month) {
  const first = iso(new Date(year, month, 1));
  const last = iso(new Date(year, month + 1, 0));
  const out = [];
  for (let w = weekStart(first); w <= last; w = addDays(w, 7)) out.push(w);
  return out;
}

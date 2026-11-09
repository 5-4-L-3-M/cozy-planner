import { useEffect, useRef } from 'react';

// Phone motion: each charm is its own little pendulum (own weight, springiness, idle drift),
// so they hang toward real "down" when you tilt, swing a little when you move, and never sway in sync.
const charms = new Set();
let target = 0, live = false, started = false, raf = 0, last = 0;
const rnd = (a, b) => a + Math.random() * (b - a);
function loop(t) {
  const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
  const s = t / 1000;
  for (const c of charms) {
    const goal = target * c.gain + c.amp * Math.sin((s * 2 * Math.PI) / c.per + c.ph);
    c.w += (-(c.th - goal) * c.k - c.w * c.d) * dt;
    c.th += c.w * dt;
    if (c.el) c.el.style.transform = `rotate(${c.th.toFixed(2)}deg)`;
  }
  raf = charms.size ? requestAnimationFrame(loop) : 0;
}
function startMotion() {
  if (started || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: coarse)').matches) return;
  started = true;
  addEventListener('devicemotion', (e) => {
    const g = e.accelerationIncludingGravity, a = e.acceleration;
    if (!g || g.x == null) return;
    if (!live) { live = true; document.documentElement.classList.add('charm-motion'); }
    target = Math.hypot(g.x, g.y) > 3 ? Math.max(-15, Math.min(15, (Math.atan2(g.x, g.y) * 180) / Math.PI)) : 0;
    const ax = a && a.x != null && Math.abs(a.x) > 0.4 ? a.x : 0;
    if (ax) for (const c of charms) c.w += ax * 1.2 * c.gain;
    if (!raf && charms.size) raf = requestAnimationFrame(loop);
  });
}

// Dangling journal charms. Beads pick up the cover color so each charm matches its book.
const mix = (hex, t) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
};
const O = '#3d3121';
// Wood tone at the same lightness as the cover (light cover = light wood, dark cover = dark wood).
const lightOf = (hex) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255]; return (Math.max(...c) + Math.min(...c)) / 510; };
const wood = (hex, dl = 0) => `hsl(30 ${Math.round(42 - dl * 20)}% ${Math.round(Math.min(78, Math.max(28, lightOf(hex) * 100)) + dl * 100)}%)`;

const PENDANTS = {
  cat: (a) => (
    <g>
      <path d="M8 128C6 116 8 108 12 104L11 94L19 101C21 100 23 100 25 101L33 94L32 104C36 108 38 116 36 128Z" fill="#fffaf1" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15 113C16 111 18 111 19 113M25 113C26 111 28 111 29 113" stroke={O} strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M20 118L22 120L24 118" stroke={O} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <circle cx="14" cy="118" r="1.8" fill={mix(a, 0.45)} /><circle cx="30" cy="118" r="1.8" fill={mix(a, 0.45)} />
    </g>
  ),
  celestial: () => (
    <g>
      <path d="M26 98C14 100 9 112 13 122C17 132 29 134 36 128C27 128 21 120 21 112C21 106 23 101 26 98Z" fill="#f3d98a" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M31 104L32.5 108L36.5 109.5L32.5 111L31 115L29.5 111L25.5 109.5L29.5 108Z" fill="#fffaf1" stroke={O} strokeWidth="1.1" strokeLinejoin="round" />
    </g>
  ),
  plant: () => (
    <g>
      <path d="M22 132V112" stroke={O} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M22 118C12 118 8 110 8 102C17 102 22 108 22 118Z" fill="#98a487" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M22 112C31 112 36 104 36 96C27 96 22 102 22 112Z" fill="#b6c49f" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 132H30L28 140H16Z" fill="#cf826d" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  ),
  spooky: () => (
    <g>
      <path d="M10 136V110C10 100 15 96 22 96C29 96 34 100 34 110V136L30 132L26 136L22 132L18 136L14 132Z" fill="#fffaf1" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <ellipse cx="18" cy="112" rx="2" ry="3" fill={O} /><ellipse cx="26" cy="112" rx="2" ry="3" fill={O} />
      <ellipse cx="22" cy="121" rx="2.4" ry="2" fill={O} />
    </g>
  ),
  thanksgiving: () => (
    <g>
      <path d="M22 96L25 104L32 101L29 109L37 110L30 116L33 122L25 120L23 128L21 120L13 122L16 116L8 110L16 109L13 101L20 104Z" fill="#cf826d" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M22 108V136" stroke={O} strokeWidth="1.6" strokeLinecap="round" />
    </g>
  ),
  christmas: (a) => (
    <g>
      <rect x="18" y="98" width="8" height="6" rx="1.5" fill="#d4b48b" stroke={O} strokeWidth="1.3" />
      <circle cx="22" cy="118" r="14" fill="#c95a55" stroke={O} strokeWidth="1.6" />
      <path d="M10 114C16 118 28 118 34 114" stroke="#fffaf1" strokeWidth="2" fill="none" />
      <circle cx="17" cy="112" r="2.4" fill="#fffaf1" opacity=".75" />
      <circle cx="22" cy="124" r="1.6" fill={mix(a, 0.5)} /><circle cx="28" cy="122" r="1.6" fill="#f3d98a" /><circle cx="16" cy="122" r="1.6" fill="#f3d98a" />
    </g>
  ),
  heart: (a) => (
    <g>
      <path d="M22 132C10 124 7 116 7 110C7 104 11 100 16 100C19 100 21 102 22 104C23 102 25 100 28 100C33 100 37 104 37 110C37 116 34 124 22 132Z" fill={mix(a, 0.35)} stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 108C13 105 15 104 17 104" stroke="#fffaf1" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".85" />
    </g>
  ),
  strawberry: () => (
    <g>
      <path d="M22 104C31 104 36 110 34 118C32 127 26 134 22 134C18 134 12 127 10 118C8 110 13 104 22 104Z" fill="#e57b80" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 104L18 100L22 103L26 100L30 104L22 107Z" fill="#98a487" stroke={O} strokeWidth="1.3" strokeLinejoin="round" />
      <g fill="#fff4c7"><circle cx="17" cy="114" r="1" /><circle cx="24" cy="113" r="1" /><circle cx="29" cy="118" r="1" /><circle cx="20" cy="121" r="1" /><circle cx="26" cy="125" r="1" /><circle cx="15" cy="122" r="1" /></g>
    </g>
  ),
  mushroom: () => (
    <g>
      <path d="M8 114C8 104 14 98 22 98C30 98 36 104 36 114Z" fill="#d9605d" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <g fill="#fffaf1"><circle cx="16" cy="106" r="2.3" /><circle cx="26" cy="104" r="1.8" /><circle cx="30" cy="110" r="1.6" /><circle cx="21" cy="110" r="1.4" /></g>
      <path d="M16 114H28L27 130C27 133 17 133 17 130Z" fill="#fff4e3" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  ),
  crystal: () => (
    <g>
      <path d="M22 98L31 108L28 132H16L13 108Z" fill="#c8b2e6" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 108H31M22 98L19 108L22 132L25 108Z" stroke={O} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
      <path d="M17 112L18.5 122" stroke="#fffaf1" strokeWidth="1.8" strokeLinecap="round" opacity=".8" />
    </g>
  ),
  daisy: () => (
    <g>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => <ellipse key={d} cx="22" cy="106" rx="4" ry="8" transform={`rotate(${d} 22 116)`} fill="#fffaf1" stroke={O} strokeWidth="1.2" />)}
      <circle cx="22" cy="116" r="5" fill="#f3d98a" stroke={O} strokeWidth="1.3" />
    </g>
  ),
  bow: (a) => (
    <g>
      <path d="M22 110C15 102 7 102 7 110C7 118 15 118 22 110Z" fill={mix(a, 0.3)} stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M22 110C29 102 37 102 37 110C37 118 29 118 22 110Z" fill={mix(a, 0.3)} stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M20 112L14 132L19 129L21 134ZM24 112L30 132L25 129L23 134Z" fill={mix(a, 0.15)} stroke={O} strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="22" cy="110" r="3.4" fill={mix(a, 0.15)} stroke={O} strokeWidth="1.4" />
    </g>
  ),
  star: () => (
    <g>
      <path d="M22 98L26.5 108.5L37.5 109.5L29 117L31.5 128L22 122.2L12.5 128L15 117L6.5 109.5L17.5 108.5Z" fill="#f3d98a" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M17 112C18 110 19 109 21 109" stroke="#fffaf1" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </g>
  ),
  cherries: () => (
    <g>
      <path d="M22 98C20 106 16 112 14 120M22 98C24 106 28 112 30 120" stroke="#6f8f62" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M22 98C26 95 31 96 33 99C29 101 25 101 22 98Z" fill="#98a487" stroke={O} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="14" cy="125" r="7" fill="#c95a55" stroke={O} strokeWidth="1.5" /><circle cx="30" cy="125" r="7" fill="#c95a55" stroke={O} strokeWidth="1.5" />
      <circle cx="12" cy="122" r="1.6" fill="#fffaf1" opacity=".8" /><circle cx="28" cy="122" r="1.6" fill="#fffaf1" opacity=".8" />
    </g>
  ),
  sun: () => (
    <g>
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((d) => <path key={d} d="M22 99L24 104H20Z" transform={`rotate(${d} 22 116)`} fill="#e9a35f" stroke={O} strokeWidth=".9" strokeLinejoin="round" />)}
      <circle cx="22" cy="116" r="10" fill="#f3d98a" stroke={O} strokeWidth="1.5" />
      <path d="M18 114h.01M26 114h.01" stroke={O} strokeWidth="2.4" strokeLinecap="round" /><path d="M18.5 119C20.5 121 23.5 121 25.5 119" stroke={O} strokeWidth="1.3" fill="none" strokeLinecap="round" />
    </g>
  ),
  dnd: (a) => (
    <g>
      <circle cx="22" cy="98.5" r="2.4" fill="none" stroke="#5a4a38" strokeWidth="1.6" />
      <path d="M22 101L34.5 108.5V123.5L22 131L9.5 123.5V108.5Z" fill={wood(a)} stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M11 112C16 110 20 115 26 112S32 110 34 112M10 118C15 116 21 121 27 118S32 117 34 119M11 125C16 123 21 127 27 125" stroke={wood(a, -0.14)} strokeWidth=".9" fill="none" opacity=".8" />
      <path d="M22 107L30 121H14Z" fill={wood(a, 0.08)} stroke={O} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M22 101V107M9.5 108.5L22 107L34.5 108.5M9.5 108.5L14 121L9.5 123.5M34.5 108.5L30 121L34.5 123.5M14 121L22 131L30 121" stroke={O} strokeWidth="1.1" fill="none" strokeLinejoin="round" />
      <text x="22" y="118.8" textAnchor="middle" fontSize="7" fontWeight="700" fontFamily="Georgia, serif" fill={a} stroke={O} strokeWidth=".7" paintOrder="stroke">20</text>
    </g>
  ),
};
export const CHARMS = [['cat', 'Cat'], ['celestial', 'Celestial'], ['plant', 'Plant'], ['heart', 'Heart'], ['strawberry', 'Strawberry'], ['mushroom', 'Mushroom'], ['crystal', 'Crystal'], ['daisy', 'Daisy'], ['bow', 'Bow'], ['star', 'Star'], ['cherries', 'Cherries'], ['sun', 'Sun'], ['spooky', 'Spooky'], ['thanksgiving', 'Harvest'], ['christmas', 'Christmas'], ['dnd', 'D20']];
const BEADS = { cat: ['#fffaf1', '#3d3121'], celestial: ['#f3d98a', '#6e819c'], plant: ['#98a487', '#cf826d'], spooky: ['#3d3121', '#e8b440'], thanksgiving: ['#e8b440', '#8a5a3c'], christmas: ['#98a487', '#c95a55'], dnd: ['cover', '#e8b440'], heart: ['#fffaf1', 'cover'], strawberry: ['#fffaf1', '#98a487'], mushroom: ['#fff4e3', '#d9605d'], crystal: ['#e8dcf5', '#9ec5d8'], daisy: ['#f3d98a', '#fffaf1'], bow: ['#fffaf1', 'cover'], star: ['#fffaf1', '#f3d98a'], cherries: ['#98a487', '#c95a55'], sun: ['#e9a35f', '#f3d98a'] };

export default function Charm({ type, color = '#4f8380', size = 1, style, noKnot }) {
  const el = useRef(null);
  const me = useRef(null);
  if (!me.current) me.current = { th: 0, w: 0, k: rnd(20, 36), d: rnd(1.6, 2.8), gain: rnd(0.25, 0.4), amp: rnd(1.2, 2.2), per: rnd(3.2, 5.4), ph: rnd(0, 6.3), dur: rnd(3.2, 4.8), delay: -rnd(0, 4) };
  useEffect(() => {
    startMotion();
    const c = me.current; c.el = el.current; charms.add(c);
    if (live && !raf) raf = requestAnimationFrame(loop);
    return () => { charms.delete(c); };
  }, []);
  if (!type || !PENDANTS[type]) return null;
  let [b1, b2] = BEADS[type] || ['#fffaf1', 'cover'];
  if (b1 === 'cover') b1 = color;
  if (b2 === 'cover') b2 = color;
  const a = mix(color, 0.35);
  return (
    <svg ref={el} className="charm" viewBox="0 0 44 146" width={44 * size} height={146 * size} style={{ animationDuration: me.current.dur + 's', animationDelay: me.current.delay + 's', ...style }} aria-hidden="true">
      <path d="M22 5C20.5 24 23.5 44 22 63" stroke="#3a2c1e" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {!noKnot && <circle cx="22" cy="5" r="3.4" fill="#3a2c1e" />}
      <circle cx="22" cy="66" r="3.6" fill="none" stroke="#5a4a38" strokeWidth="2" />
      <circle cx="22" cy="74" r="4.6" fill={a} stroke={O} strokeWidth="1.1" />
      <circle cx="22" cy="83.5" r="3.6" fill={b1} stroke={O} strokeWidth="1.1" />
      <circle cx="22" cy="91" r="3" fill={b2} stroke={O} strokeWidth="1" />
      {PENDANTS[type](color)}
    </svg>
  );
}
export { mix };

// Bookmark-style: the cord comes straight out of the top edge of the book and hangs down. at = x in px from the book's left edge.
export function BookCharm({ type, color, size = 1, at }) {
  if (!type || !PENDANTS[type]) return null;
  return <Charm type={type} color={color} size={size} noKnot style={{ position: 'absolute', left: at - 22 * size, top: -5 * size }} />;
}

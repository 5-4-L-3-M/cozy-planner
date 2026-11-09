import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DECOR, DecorArt, POT_COLORS, FURN_COLORS, ACC_STYLES, LIGHT_COLORS, WAX_COLORS, RUG_COLORS, recolor } from './roomArt';

/* ---------- room themes ---------- */
// Each theme sets the wallpaper, floor, shelf wood, curtains, and a starter set of decor.
// Starter anchors: row = sits on that shelf (x = 0..1 along it); wall = x 0..1, y px from top; floor = x 0..1.
export const THEMES = {
  coquette: {
    name: 'Coquette', wall: '#f6dfe3', pat: 'stripes', ink: '#5a3d44', floor: '#e9d3c0', shelf: '#f3ebe4', curtain: '#f2b8c6', frame: '#fffaf6', rug: '#f7c9d4',
    items: [['bowGarland', 'wall', 0.58, 70], ['ovalMirror', 'wall', 0.93, 190], ['flowerVase', 'row', 0, 0.86], ['perfume', 'row', 0, 0.95], ['teacup', 'row', 1, 0.9], ['pearlDish', 'row', 1, 0.78], ['bow', 'wall', 0.1, 470], ['wovenRug', 'floor', 0.5]],
  },
  witchy: {
    name: 'Witchy dark academia', wall: '#2f3a33', pat: 'damask', ink: '#efe3cf', floor: '#4a3426', shelf: '#4a3328', curtain: '#6e2a2f', frame: '#3b2a20', rug: '#5a2a30',
    items: [['moonGarland', 'wall', 0.58, 70], ['candles', 'row', 0, 0.88], ['skull', 'row', 0, 0.96], ['crystal', 'row', 1, 0.78], ['potions', 'row', 1, 0.9], ['oldBooks', 'row', 1, 0.99], ['blackCat', 'floor', 0.88], ['globe', 'row', 0, 0.76], ['tarot', 'row', 2, 0.9]],
  },
  plant: {
    name: 'Plant mom', wall: '#dfe7d6', pat: 'leafy', ink: '#3b4a35', floor: '#d9c2a3', shelf: '#b89068', curtain: '#f4efe2', frame: '#fffdf6', rug: '#c9d6b8',
    items: [['hangingPlant', 'wall', 0.93, 120], ['monstera', 'row', 0, 0.9], ['pothos', 'row', 1, 0.9], ['succulents', 'row', 1, 0.75], ['sprout', 'row', 0, 0.78], ['snakePlant', 'floor', 0.06], ['fiddleFig', 'floor', 0.94], ['cactus', 'row', 2, 0.85]],
  },
  minimal: {
    name: 'Minimalist', wall: '#f1eee8', pat: 'none', ink: '#3a3836', floor: '#e3dcd1', shelf: '#f7f5f1', curtain: '#ffffff', frame: '#ffffff', rug: '#d9d4cc',
    items: [['clock', 'wall', 0.93, 160], ['ceramicVase', 'row', 0, 0.9], ['smallFrame', 'row', 1, 0.86], ['bookends', 'row', 1, 0.97], ['sprout', 'row', 0, 0.8]],
  },
  boho: {
    name: 'Boho', wall: '#ecd6c0', pat: 'arches', ink: '#5b3a26', floor: '#c99d74', shelf: '#a8774f', curtain: '#e8c8a0', frame: '#c7955f', rug: '#d98e6a',
    items: [['macrame', 'wall', 0.1, 460], ['sunMirror', 'wall', 0.93, 170], ['fairyLights', 'wall', 0.58, 70], ['pampas', 'row', 0, 0.9], ['basket', 'floor', 0.9], ['wovenRug', 'floor', 0.5], ['mug', 'row', 1, 0.85], ['succulents', 'row', 1, 0.95]],
  },
};
export const SW = 1000; // the room is laid out on a 1000-wide stage, then scaled to fit any screen
const isStrand = (k) => /lights|garland/i.test(k);
const starter = (th) => THEMES[th].items.filter(([k]) => D(k)).map(([k, t, a, b], i) => ({
  id: 'd' + Date.now().toString(36) + i, k, sc: 1, z: i,
  a: t === 'wall' && isStrand(k) ? { t: 'case' } : t === 'row' ? { t, r: a, x: b, y: 0 } : t === 'wall' ? { t, x: Math.round(a * SW), y: b } : { t, x: Math.round(a * SW), y: 0 },
}));
// Older saves used fractions of the screen for wall/floor spots; turn those into stage spots.
const upgrade = (items) => items.map((it) => (it.a.t !== 'row' && it.a.x <= 1 ? { ...it, a: { ...it.a, x: Math.round(it.a.x * SW) } } : it));
// v3: light strings and garlands drape across the top of the bookcase by default.
const strandsToCase = (items) => items.map((it) => (/lights|garland/i.test(it.k) && it.a.t === 'wall' ? { ...it, a: { t: 'case' } } : it));
const upgradeOld = (r) => { const v = (r || {}).v || 1; let l = (r || {}).items || []; if (v < 2) l = upgrade(l); if (v < 3) l = strandsToCase(l); return l; };

/* ---------- weather ---------- */
const WX_URL = (lat, lon) => `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto&temperature_unit=fahrenheit`;
// Optional fallback spot if location is off: VITE_WEATHER_LAT / VITE_WEATHER_LON in .env. Without it, the window just shows a sunny sky.
const HOME = import.meta.env.VITE_WEATHER_LAT && import.meta.env.VITE_WEATHER_LON ? { lat: +import.meta.env.VITE_WEATHER_LAT, lon: +import.meta.env.VITE_WEATHER_LON } : null;
const ls = { get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } } };
function kindOf(code) {
  if (code == null) return 'clear';
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 51 && code <= 67) return code >= 61 ? 'rain' : 'drizzle';
  if (code >= 80 && code <= 82) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code === 3) return 'cloudy';
  if (code === 1 || code === 2) return 'partly';
  return 'clear';
}
// A little line about the weather in each room's voice.
const SAY = {
  coquette: { clear: 'sunny & sweet ♡', partly: 'a little cloudy ♡', cloudy: 'cozy & cloudy ♡', fog: 'dreamy fog ♡', drizzle: 'pitter-patter ♡', rain: 'rainy day, tea time ♡', snow: 'snowflakes & bows ♡', storm: 'stormy · stay cozy ♡' },
  witchy: { clear: 'clear skies · good omens', partly: 'veiled skies', cloudy: 'grey skies · candle weather', fog: 'the veil is thin', drizzle: 'a soft drizzle', rain: 'rain · read by candlelight', snow: 'snowfall · stay in', storm: 'thunder · witch weather' },
  plant: { clear: 'full sun · happy leaves', partly: 'bright indirect light', cloudy: 'low light day', fog: 'misty · humidity’s up', drizzle: 'drizzle · free water', rain: 'rain · the plants are thrilled', snow: 'snow · bring the babies in', storm: 'storm · keep them inside' },
  minimal: {},
  boho: { clear: 'golden & clear ☼', partly: 'soft sun, slow day', cloudy: 'cloudy & mellow', fog: 'hazy & hushed', drizzle: 'soft rain day', rain: 'rainy & slow', snow: 'snowy · warm inside', storm: 'stormy · light a candle' },
};
const MARK = { coquette: '♡', witchy: '☾', plant: '❦', minimal: '', boho: '☼' };
// Weather tag options (Room tab). A preset sets the look; every piece can be swapped.
const WX_STYLES = [['coquette', 'Coquette'], ['witchy', 'Witchy'], ['plant', 'Plant sign'], ['minimal', 'Minimal'], ['boho', 'Boho'], ['plain', 'Plain card'], ['off', 'No tag']];
const WX_FONTS = { script: "'Dancing Script', cursive", hand: "'Patrick Hand', cursive", serif: "Georgia, 'Times New Roman', serif", clean: 'Nunito, system-ui, sans-serif', caveat: "Caveat, cursive" };
const WX_FONT_LIST = [['script', 'Script'], ['hand', 'Handwritten'], ['caveat', 'Scribbly'], ['serif', 'Storybook'], ['clean', 'Clean']];
const WX_WORDS = [['coquette', 'Sweet'], ['witchy', 'Witchy'], ['plant', 'Plant talk'], ['boho', 'Slow & cozy'], ['plain', 'Just the weather'], ['custom', 'My own words']];
const WX_MARKS = ['♡', '☾', '❦', '☼', '✦', '✿', '★', '☁', '♪', ''];
const WX_BGS = ['#fde8ee', '#f2b8c6', '#efe3c8', '#c9a27a', '#d98e6a', '#f1e6d0', '#dfe7d6', '#a9b89a', '#dbe4ee', '#e6dcf0', '#ffffff', '#3b2a20', '#2b2a3a', '#3a3633'];
const WX_FGS = ['#8c4a5c', '#3b2a20', '#3b2a1a', '#3a3836', '#5b3a26', '#3b4a35', '#4a5a7a', '#5b3a5e', '#fff7ef', '#efe3cf', '#ffd27a'];
const LABEL = { clear: 'Clear', partly: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Foggy', drizzle: 'Drizzle', rain: 'Rain', snow: 'Snow', storm: 'Thunderstorm' };
export function useWeather() {
  const [wx, setWx] = useState(() => ls.get('wx'));
  useEffect(() => {
    let live = true;
    const load = async (c) => {
      try {
        const j = await (await fetch(WX_URL(c.lat, c.lon))).json();
        let place = c.place;
        if (!place) {
          try {
            const g = await (await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${c.lat}&longitude=${c.lon}&localityLanguage=en`)).json();
            place = g.locality || g.city || g.principalSubdivision || '';
            if (place && !c.home) ls.set('wxc', { ...c, place });
          } catch { /* no town name, that's fine */ }
        }
        const v = { t: Math.round(j.current.temperature_2m), code: j.current.weather_code, day: !!j.current.is_day, hi: Math.round(j.daily?.temperature_2m_max?.[0]), lo: Math.round(j.daily?.temperature_2m_min?.[0]), at: Date.now(), home: !!c.home, place: place || '' };
        ls.set('wx', v); if (live) setWx(v);
      } catch { /* offline: keep the last one */ }
    };
    const go = () => {
      const c = ls.get('wxc');
      if (c) return load(c);
      if (!navigator.geolocation) return HOME && load({ ...HOME, home: true });
      navigator.geolocation.getCurrentPosition(
        (p) => { const v = { lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2) }; ls.set('wxc', v); load(v); },
        () => HOME && load({ ...HOME, home: true }), { maximumAge: 3600e3, timeout: 15000 });
    };
    if (!wx || !wx.at || !Number.isFinite(wx.hi) || wx.place === undefined || Date.now() - wx.at > 20 * 60e3) go();
    const t = setInterval(go, 20 * 60e3);
    return () => { live = false; clearInterval(t); };
  }, []);
  return wx;
}

// Window shapes: [frame outline, glass outline]. The glass sits inside x 22–178, y 22–208.
const WSHAPES = {
  round: ['M92 14H108A78 78 0 0 1 186 92V138A78 78 0 0 1 108 216H92A78 78 0 0 1 14 138V92A78 78 0 0 1 92 14Z', 'M92 22H108A70 70 0 0 1 178 92V138A70 70 0 0 1 108 208H92A70 70 0 0 1 22 138V92A70 70 0 0 1 92 22Z'],
  arch: ['M14 216V100A86 86 0 0 1 186 100V216Z', 'M22 208V100A78 78 0 0 1 178 100V208Z'],
  square: ['M22 14H178Q186 14 186 22V208Q186 216 178 216H22Q14 216 14 208V22Q14 14 22 14Z', 'M25 22H175Q178 22 178 25V205Q178 208 175 208H25Q22 208 22 205V25Q22 22 25 22Z'],
  gothic: ['M14 216V112Q14 44 100 6Q186 44 186 112V216Z', 'M22 208V112Q22 52 100 16Q178 52 178 112V208Z'],
  circle: ['M100 23A92 92 0 1 1 99.9 23Z', 'M100 31A84 84 0 1 1 99.9 31Z'],
};
export const WINDOW_SHAPES = [['round', 'Rounded'], ['arch', 'Arched'], ['square', 'Square'], ['gothic', 'Gothic'], ['circle', 'Round porthole']];
export const CURTAIN_STYLES = [['drape', 'Long drapes'], ['tied', 'Tied back'], ['cafe', 'Café half'], ['valance', 'Scalloped valance'], ['none', 'No curtains']];
const CURTAIN_COLORS = ['#f2b8c6', '#fbeef0', '#ffffff', '#f4efe2', '#e8c8a0', '#d98e6a', '#d9a93f', '#a9b89a', '#8fa8bf', '#b9a3cf', '#6e2a2f', '#2f2a35', '#3a3633'];
const mirror = (d) => d.replace(/([MLQHVCAZ])([^MLQHVCAZ]*)/g, (m, c, args) => {
  const n = args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
  if (c === 'H') return 'H' + (200 - n[0]);
  if (c === 'V' || c === 'Z' || !n.length) return c + args;
  return c + n.map((v, i) => (i % 2 ? v : 200 - v)).join(' ');
});
function Curtains({ style, c }) {
  const S = { fill: c, stroke: '#3d3121', strokeWidth: 1.6, strokeLinejoin: 'round', opacity: 0.96 };
  const fold = { stroke: '#3d3121', strokeWidth: 1, opacity: 0.2, fill: 'none', strokeLinecap: 'round' };
  const rod = <g><rect x="0" y="6" width="200" height="8" rx="4" fill="#3d3121" opacity=".75" /><circle cx="3" cy="10" r="5" fill="#3d3121" opacity=".8" /><circle cx="197" cy="10" r="5" fill="#3d3121" opacity=".8" /></g>;
  if (style === 'none') return null;
  if (style === 'cafe') {
    return (
      <g>
        <path d={`M22 116H178V206Q165 214 152 206Q139 214 126 206Q113 214 100 206Q87 214 74 206Q61 214 48 206Q35 214 22 206Z`} {...S} />
        <path d="M48 120V204M74 120V204M100 120V204M126 120V204M152 120V204" {...fold} />
        <rect x="14" y="110" width="172" height="6" rx="3" fill="#3d3121" opacity=".75" />
      </g>
    );
  }
  if (style === 'valance') {
    return (
      <g>
        {rod}
        <path d={`M3 12H197V44H190${Array.from({ length: 7 }, (_, i) => `Q${177 - i * 26} 60 ${164 - i * 26} 44`).join('')}H3Z`} {...S} />
        <path d="M3 22H197" stroke="#fff" strokeWidth="1.6" opacity=".5" strokeDasharray="4 3" />
        {Array.from({ length: 7 }, (_, i) => <circle key={i} cx={177 - i * 26} cy="52" r="2.2" fill="#fff" opacity=".7" />)}
      </g>
    );
  }
  const L = style === 'tied' ? 'M4 14L52 14Q36 80 16 128Q30 182 34 240L4 240Z' : 'M14 14Q-4 120 22 240L4 240L4 14Z';
  const F = style === 'tied' ? 'M18 18Q16 70 13 124M30 18Q24 80 14 128M14 134Q18 180 20 236' : 'M10 30Q4 120 12 230';
  return (
    <g>
      <path d={L} {...S} /><path d={F} {...fold} />
      <path d={mirror(L)} {...S} /><path d={mirror(F)} {...fold} />
      {style === 'tied' && [14, 186].map((x) => <g key={x}><rect x={x - 11} y="124" width="22" height="9" rx="4.5" fill="#d9b45a" stroke="#3d3121" strokeWidth="1.3" /><circle cx={x} cy="128.5" r="3" fill="#fff" opacity=".5" /></g>)}
      {rod}
    </g>
  );
}
export function WeatherWindow({ wx, th, t: tt }) {
  const k = kindOf(wx?.code), day = wx ? wx.day : true;
  const wet = k === 'rain' || k === 'drizzle' || k === 'storm';
  const sky = !day ? (k === 'clear' || k === 'partly' ? ['#1d2547', '#3b3f6b'] : ['#2a2e3b', '#454a59'])
    : k === 'clear' ? ['#8fc4ec', '#d6ecf7'] : k === 'partly' ? ['#9cc6e4', '#e0eef5'] : k === 'snow' ? ['#c9d3dc', '#eef1f4'] : ['#a3adb8', '#d3d8dd'];
  const t = tt || THEMES[th], frame = t.trim || t.frame, [outer, glass] = WSHAPES[t.wshape] || WSHAPES.round;
  const ws = t.wxs || th, sayKey = t.wxsay || th;
  const words = sayKey === 'custom' ? (t.wxtext || LABEL[k]) : sayKey === 'plain' ? LABEL[k] : SAY[sayKey]?.[k] || LABEL[k];
  const mark = t.wxmark != null ? t.wxmark : ws === 'plain' ? '' : MARK[ws] || '';
  const deg = (f) => (t.wxunit === 'C' ? Math.round(((f - 32) * 5) / 9) : f);
  const sub = [];
  if (t.wxdate) sub.push(new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
  if (wx && t.wxhl !== false && Number.isFinite(wx.hi)) sub.push(`H ${deg(wx.hi)}° · L ${deg(wx.lo)}°`);
  if (wx && t.wxplace !== false && wx.place) sub.push(wx.place);
  const cloud = (x, y, s, cls, dark) => (
    <g className={cls} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M10 30 Q8 18 20 17 Q24 6 37 9 Q46 2 55 11 Q68 10 67 22 Q76 24 72 32 Z" fill={dark ? '#9aa1ab' : '#fff'} opacity={dark ? 0.95 : 0.92} />
    </g>
  );
  return (
    <figure className="rwin" aria-label={wx ? `Weather: ${wx.t}°, ${LABEL[k]}` : 'Weather window'}>
      <svg viewBox="0 0 200 250" width="100%" height="100%">
        <defs>
          <linearGradient id="wxsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient>
          <clipPath id="wxclip"><path d={glass} /></clipPath>
        </defs>
        <path d={outer} fill={frame} stroke="#3d3121" strokeWidth="2" />
        <g clipPath="url(#wxclip)">
          <rect x="0" y="0" width="200" height="250" fill="url(#wxsky)" />
          {!day && (k === 'clear' || k === 'partly') && [[50, 50], [130, 40], [90, 80], [150, 95], [60, 120], [115, 125]].map(([x, y], i) => <circle key={i} className="wxstar" style={{ animationDelay: i * 0.6 + 's' }} cx={x} cy={y} r="1.6" fill="#fff6d8" />)}
          {(k === 'clear' || k === 'partly') && (day
            ? <g className="wxsun"><circle cx="128" cy="70" r="22" fill="#ffd970" /><circle cx="128" cy="70" r="32" fill="#ffd970" opacity=".25" /></g>
            : <g><circle cx="128" cy="68" r="17" fill="#fff4cf" /><circle cx="136" cy="62" r="15" fill={sky[0]} /></g>)}
          {(k === 'partly' || k === 'cloudy' || wet || k === 'snow' || k === 'fog') && cloud(-10, 40, 1.2, 'wxc1', wet || !day)}
          {(k === 'cloudy' || wet || k === 'snow' || k === 'fog') && cloud(70, 70, 1.4, 'wxc2', wet || !day)}
          {k === 'partly' && cloud(90, 110, 0.9, 'wxc2', !day)}
          {wet && <g className={'wxrain' + (k === 'drizzle' ? ' light' : '')}>{Array.from({ length: k === 'drizzle' ? 10 : 18 }, (_, i) => <line key={i} x1={20 + ((i * 37) % 170)} y1={60 + ((i * 53) % 150)} x2={16 + ((i * 37) % 170)} y2={72 + ((i * 53) % 150)} stroke="#dbe9f5" strokeWidth="2" strokeLinecap="round" style={{ animationDelay: -(i % 6) * 0.13 + 's' }} />)}</g>}
          {k === 'snow' && <g className="wxsnow">{Array.from({ length: 16 }, (_, i) => <circle key={i} cx={20 + ((i * 41) % 165)} cy={40 + ((i * 59) % 170)} r={2 + (i % 3)} fill="#fff" style={{ animationDelay: -(i % 8) * 0.5 + 's' }} />)}</g>}
          {k === 'storm' && <path className="wxbolt" d="M110 95 L96 130 L108 130 L98 160 L124 120 L111 120 L120 95 Z" fill="#ffe27a" />}
          {k === 'fog' && <g className="wxfog">{[110, 140, 170].map((y) => <rect key={y} x="10" y={y} width="180" height="12" rx="6" fill="#fff" opacity=".55" />)}</g>}
          <rect x="0" y="175" width="200" height="40" fill={day ? '#9fbf8a' : '#3c4a3c'} opacity=".9" />
          <path d="M100 0 V250 M0 115 H200" stroke={frame} strokeWidth="6" />
          <path d="M100 0 V250 M0 115 H200" stroke="#3d3121" strokeWidth="1" opacity=".35" />
        </g>
        <path d={glass} fill="none" stroke="#3d3121" strokeWidth="1.2" opacity=".5" />
        <rect x="6" y="208" width="188" height="14" rx="4" fill={frame} stroke="#3d3121" strokeWidth="2" />
        <Curtains style={t.cstyle || 'drape'} c={t.curtain} />
      </svg>
      {wx && ws !== 'off' && (
        <figcaption className={'wxtag t-' + ws + (t.wxfont ? ' fx' : '')} style={{ background: t.wxbg, color: t.wxfg, fontFamily: WX_FONTS[t.wxfont] }}>
          {mark && <i className="wxmark" style={t.wxfg ? { color: t.wxfg } : undefined}>{mark}</i>}
          <b>{deg(wx.t)}°{t.wxunit === 'C' ? 'C' : ''}</b>
          <span>{words}</span>
          {(sub.length > 0) && <small>{sub.join(' · ')}</small>}
        </figcaption>
      )}
    </figure>
  );
}

/* ---------- placing decor ---------- */
// Everything lives on the stage, so a spot is the same spot on PC and phone.
function useBoxes(stage, k, deps) {
  const [b, setB] = useState(null);
  useLayoutEffect(() => {
    const el = stage.current; if (!el) return;
    const m = () => {
      const R = el.getBoundingClientRect(), z = R.width / SW || 1;
      const rows = [...el.querySelectorAll('.shelfrow')].map((r) => {
        const a = r.getBoundingClientRect(), p = r.querySelector('.plank')?.getBoundingClientRect() || a;
        return { l: (a.left - R.left) / z, w: a.width / z, top: (a.top - R.top) / z, plank: (p.top - R.top) / z };
      });
      const fl = el.querySelector('.rfloor')?.getBoundingClientRect();
      const bc = el.querySelector('.bookcase')?.getBoundingClientRect();
      setB({ rows, floor: fl ? (fl.top - R.top) / z : el.offsetHeight - 130, H: el.offsetHeight, bc: bc ? { l: (bc.left - R.left) / z, top: (bc.top - R.top) / z, w: bc.width / z } : null });
    };
    m();
    const ro = new ResizeObserver(m); ro.observe(el);
    return () => ro.disconnect();
  }, [k, ...deps]);
  return b;
}
const SCALE = { shelf: 1.5, wall: 1.3, floor: 1.35 };
function place(it, b) {
  const d = D(it.k); if (!d || !b) return null;
  const k = (d.tints && d.where === 'floor' ? 1.85 : SCALE[d.where]) || 1, w = d.w * it.sc * k, h = d.h * it.sc * k, a = it.a;
  if (a.t === 'row') {
    const r = b.rows[Math.min(a.r, b.rows.length - 1)]; if (!r) return null;
    return { left: r.l + a.x * r.w - w / 2, top: r.plank - h + (a.y || 0), w, h };
  }
  if (a.t === 'case' && b.bc) { const ww = b.bc.w + 16, hh = (d.h * (ww / 2)) / d.w; return { left: b.bc.l - 8, top: b.bc.top - hh * 0.12, w: ww, h: hh }; }
  if (a.t === 'floor') return { left: a.x - w / 2, top: b.floor + (d.h / d.w < 0.3 ? 96 : 46) - h - (a.y || 0), w, h }; // flat rugs lie further forward
  return { left: a.x - w / 2, top: a.y, w, h };
}
// Where a drop lands: on a shelf if it's over one, on the floor if low enough, otherwise on the wall.
function anchorAt(x, yBottom, yTop, b, it) {
  const d = D(it.k);
  const ri = b.rows.findIndex((r) => x >= r.l - 10 && x <= r.l + r.w + 10 && yBottom >= r.top - 10 && yBottom <= r.plank + 24);
  if (ri >= 0 && d.where !== 'wall') { const r = b.rows[ri]; const up = yBottom - r.plank; return { t: 'row', r: ri, x: Math.min(1, Math.max(0, (x - r.l) / r.w)), y: up > -10 ? 0 : Math.round(up) }; } // stays where you drop it (so you can stack); snaps onto the shelf when close
  if (yBottom > b.floor - 30 && d.where !== 'wall') return { t: 'floor', x: Math.round(Math.min(SW + 60, Math.max(-60, x))), y: Math.max(-40, b.floor + 46 - yBottom) };
  return { t: 'wall', x: Math.round(Math.min(SW + 60, Math.max(-60, x))), y: Math.max(-20, Math.round(yTop)) };
}
// How big the stage is drawn on this screen.
// Fits the width, and on wide screens also keeps the whole room (floor included) in view.
function useFit(wrap, sh) {
  const [z, setZ] = useState(1);
  useLayoutEffect(() => {
    const el = wrap.current; if (!el) return;
    const m = () => {
      const byW = el.clientWidth / SW;
      const room = innerHeight - el.getBoundingClientRect().top - window.scrollY - 8;
      const byH = sh && innerWidth >= 900 ? room / sh : Infinity;
      setZ(Math.min(1.35, byW, Math.max(byW * 0.55, byH)));
    };
    m();
    const ro = new ResizeObserver(m); ro.observe(el); addEventListener('resize', m);
    return () => { ro.disconnect(); removeEventListener('resize', m); };
  }, [sh]);
  return z;
}

/* ---------- live things (a real clock) ---------- */
// These aren't drawings: they tick. Analog hangs on the wall, digital sits on a shelf; tap to recolor the case.
const LIVE = {
  liveClock: { name: 'Clock (real time)', w: 64, h: 64, where: 'wall', set: ['coquette', 'witchy', 'plant', 'minimal', 'boho', 'cozy'], tints: true, live: true },
  liveDigital: { name: 'Digital clock (real time)', w: 78, h: 40, where: 'shelf', set: ['coquette', 'witchy', 'plant', 'minimal', 'boho', 'cozy'], tints: true, live: true },
};
// Themed real-time clocks: c = [cx, cy, r] of the dial, tk = tick style, hc/sc = hand / second-hand colors.
const INKC = '#3d3121';
const st4 = (x, y, s) => `M${x} ${y - s}L${x + s * 0.3} ${y - s * 0.3}L${x + s} ${y}L${x + s * 0.3} ${y + s * 0.3}L${x} ${y + s}L${x - s * 0.3} ${y + s * 0.3}L${x - s} ${y}L${x - s * 0.3} ${y - s * 0.3}Z`;
const CLOCKS = {
  clkBow: {
    name: 'Bow clock', w: 64, h: 70, where: 'wall', set: ['coquette'], c: [32, 40, 20], tk: 'dots', ink: '#c97a8e', hc: '#9c4a60', sc: '#e391a6',
    body: () => (<g>
      {Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; return <circle key={i} cx={32 + 24 * Math.cos(a)} cy={40 + 24 * Math.sin(a)} r="5" fill="#f5c6d0" stroke={INKC} strokeWidth="1.3" />; })}
      <circle cx="32" cy="40" r="24" fill="#f5c6d0" />
      <circle cx="32" cy="40" r="20" fill="#fffaf1" stroke={INKC} strokeWidth="1.3" />
    </g>),
    over: () => (<g>
      <path d="M30 15L24 28L28 26.6L30.6 29Z M34 15L40 28L36 26.6L33.4 29Z" fill="#e391a6" stroke={INKC} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M32 14C24 5 15 8 17.5 15.5C19 20 26 18.5 32 14Z M32 14C40 5 49 8 46.5 15.5C45 20 38 18.5 32 14Z" fill="#f5c6d0" stroke={INKC} strokeWidth="1.3" strokeLinejoin="round" />
      <rect x="28.5" y="10.5" width="7" height="7" rx="2.5" fill="#e391a6" stroke={INKC} strokeWidth="1.2" />
    </g>),
  },
  clkAlarm: {
    name: 'Twin-bell alarm clock', w: 50, h: 58, where: 'shelf', set: ['coquette', 'cozy'], c: [25, 32, 13], tk: 'lines', ink: INKC, hc: '#7a4a55', sc: '#e391a6',
    body: () => (<g>
      <path d="M15 46L10 56M35 46L40 56" stroke={INKC} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17 12Q25 4 33 12" stroke={INKC} strokeWidth="2" fill="none" strokeLinecap="round" />
      {[[11, 14, -30], [39, 14, 30]].map(([x, y, a]) => <path key={x} d="M-7 3A7 7 0 0 1 7 3Z" transform={`translate(${x} ${y}) rotate(${a})`} fill="#e9c46a" stroke={INKC} strokeWidth="1.3" />)}
      <circle cx="25" cy="32" r="17" fill="#f5c6d0" stroke={INKC} strokeWidth="1.5" />
      <path d="M12 38A17 17 0 0 0 38 38A15 15 0 0 1 12 38Z" fill="#e391a6" opacity=".5" />
      <circle cx="25" cy="32" r="13" fill="#fffaf1" stroke={INKC} strokeWidth="1.2" />
    </g>),
  },
  clkMoon: {
    name: 'Moon & stars clock', w: 66, h: 76, where: 'wall', set: ['witchy'], c: [33, 42, 22], tk: 'stars', ink: '#e9c46a', hc: '#e9c46a', sc: '#c95a55',
    body: () => (<g>
      {[[18, 66, 74], [48, 66, 71]].map(([x, y0, y1]) => <g key={x}><path d={`M${x} ${y0}V${y1 - 3}`} stroke="#d9b45a" strokeWidth=".8" /><path d={st4(x, y1, 3)} fill="#e9c46a" stroke={INKC} strokeWidth=".7" /></g>)}
      <circle cx="33" cy="42" r="26" fill="#d9b45a" stroke={INKC} strokeWidth="1.5" />
      <circle cx="33" cy="42" r="22.5" fill="#2b2a3a" stroke={INKC} strokeWidth="1.2" />
      {[[24, 34], [43, 52], [40, 30], [25, 52]].map(([x, y]) => <circle key={x + '' + y} cx={x} cy={y} r=".7" fill="#fff6d8" opacity=".8" />)}
    </g>),
    over: () => (<g>
      <defs><mask id="clkmoon"><rect x="0" y="0" width="66" height="30" fill="#fff" /><circle cx="38.5" cy="10.5" r="8.6" fill="#000" /></mask><clipPath id="clkmoonc"><circle cx="33" cy="14" r="10" /></clipPath></defs>
      <circle cx="33" cy="14" r="10" fill="#e9c46a" stroke={INKC} strokeWidth="1.3" mask="url(#clkmoon)" />
      <circle cx="38.5" cy="10.5" r="8.6" fill="none" stroke={INKC} strokeWidth="1.3" clipPath="url(#clkmoonc)" />
    </g>),
  },
  clkMantel: {
    name: 'Gothic mantel clock', w: 52, h: 80, where: 'shelf', set: ['witchy', 'cozy'], c: [26, 28, 12], tk: 'lines', ink: INKC, hc: INKC, sc: '#8a2e35', pend: [26, 50, 16],
    body: () => (<g>
      <circle cx="26" cy="3.5" r="2.5" fill="#d9b45a" stroke={INKC} strokeWidth="1" />
      <path d="M6 74V30Q6 10 26 5Q46 10 46 30V74Z" fill="#4a3328" stroke={INKC} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 72V31Q10 14 26 9.5Q42 14 42 31V72" fill="none" stroke="#d9b45a" strokeWidth="1" />
      <circle cx="26" cy="28" r="14" fill="#d9b45a" stroke={INKC} strokeWidth="1.2" />
      <circle cx="26" cy="28" r="12" fill="#f3e6c4" stroke={INKC} strokeWidth="1" />
      <path d="M16 70V52Q16 46 26 45Q36 46 36 52V70Z" fill="#2b2a3a" stroke="#d9b45a" strokeWidth="1.2" />
      <rect x="2" y="72" width="48" height="7" rx="2" fill="#3b2a20" stroke={INKC} strokeWidth="1.4" />
    </g>),
  },
  clkLeafy: {
    name: 'Leafy wreath clock', w: 72, h: 72, where: 'wall', set: ['plant'], c: [36, 36, 19], tk: 'lines', ink: '#4a5a3a', hc: '#3b4a35', sc: '#d98a5f',
    body: () => (<g>
      <circle cx="36" cy="36" r="24" fill="#b89068" stroke={INKC} strokeWidth="1.5" />
      <circle cx="36" cy="36" r="20" fill="#fffaf1" stroke={INKC} strokeWidth="1.2" />
    </g>),
    over: () => (<g>
      {Array.from({ length: 13 }, (_, i) => { const a = ((95 + i * 13) * Math.PI) / 180, x = 36 + 26 * Math.cos(a), y = 36 + 26 * Math.sin(a), rot = (a * 180) / Math.PI + (i % 2 ? 35 : -35);
        return <ellipse key={i} cx={x} cy={y} rx="5.4" ry="2.6" transform={`rotate(${rot} ${x} ${y})`} fill={['#7fa66a', '#9cc283', '#5e8a52'][i % 3]} stroke={INKC} strokeWidth="1" />; })}
      {[[52, 12], [58, 18]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="4.4" ry="2.2" transform={`rotate(${-40 + i * 30} ${x} ${y})`} fill="#9cc283" stroke={INKC} strokeWidth="1" />)}
      <circle cx="18" cy="56" r="2.4" fill="#f0a8b8" stroke={INKC} strokeWidth=".8" />
    </g>),
  },
  clkSlice: {
    name: 'Wood slice clock', w: 54, h: 60, where: 'shelf', set: ['plant', 'boho', 'cozy'], c: [27, 26, 17], tk: 'dots', ink: '#6b4a2e', hc: '#4a3426', sc: '#c95a55',
    body: () => (<g>
      <path d="M17 44L12 58M37 44L42 58" stroke="#8a6a4f" strokeWidth="3" strokeLinecap="round" />
      <circle cx="27" cy="26" r="23" fill="#8a6a4f" stroke={INKC} strokeWidth="1.5" />
      <circle cx="27" cy="26" r="19.5" fill="#e3c99c" stroke={INKC} strokeWidth="1" />
      {[14, 9, 4.5].map((rr) => <circle key={rr} cx="27" cy="26" r={rr} fill="none" stroke="#c9a46a" strokeWidth=".9" />)}
      <path d="M8 8Q10 2 15 4" stroke="#6f9a5c" strokeWidth="1.4" fill="none" />
      <ellipse cx="15.5" cy="3.6" rx="3.2" ry="1.7" transform="rotate(-20 15.5 3.6)" fill="#9cc283" stroke={INKC} strokeWidth=".9" />
    </g>),
  },
  clkMinimal: {
    name: 'Simple wall clock', w: 60, h: 60, where: 'wall', set: ['minimal'], c: [30, 30, 25], tk: 'quarters', ink: '#2b2a2a', hc: '#2b2a2a', sc: '#d9604a', thin: true,
    body: () => <circle cx="30" cy="30" r="28" fill="#fbfaf7" stroke="#2b2a2a" strokeWidth="2.6" />,
  },
  clkCube: {
    name: 'Desk cube clock', w: 46, h: 46, where: 'shelf', set: ['minimal'], c: [23, 23, 13], tk: 'dots', ink: '#8a8580', hc: '#3a3836', sc: '#d9604a', thin: true,
    body: () => (<g>
      <rect x="3" y="4" width="40" height="40" rx="7" fill="#e3dcd1" stroke={INKC} strokeWidth="1.4" />
      <rect x="35" y="5" width="7" height="38" rx="3" fill={INKC} opacity=".08" />
      {[[9, 9], [37, 38], [12, 39], [38, 10]].map(([x, y]) => <circle key={x + '' + y} cx={x} cy={y} r=".7" fill="#a8a29a" />)}
      <circle cx="23" cy="23" r="15" fill="#fffaf1" stroke={INKC} strokeWidth="1" />
    </g>),
  },
  clkSun: {
    name: 'Sunburst clock', w: 80, h: 80, where: 'wall', set: ['boho'], c: [40, 40, 14], tk: 'dots', ink: '#5b3a26', hc: '#5b3a26', sc: '#c96f4a',
    body: () => (<g>
      {Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2, L = i % 2 ? 30 : 37, w = 0.09;
        const p = (rr, da) => `${40 + rr * Math.cos(a + da)} ${40 + rr * Math.sin(a + da)}`;
        return <path key={i} d={`M${p(17, -w * 2)}L${p(L, 0)}L${p(17, w * 2)}Z`} fill={i % 2 ? '#c99d74' : '#d9a93f'} stroke={INKC} strokeWidth="1" strokeLinejoin="round" />; })}
      {Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2, L = i % 2 ? 31.5 : 38.5; return <circle key={'b' + i} cx={40 + L * Math.cos(a)} cy={40 + L * Math.sin(a)} r="1.6" fill="#a8774f" stroke={INKC} strokeWidth=".7" />; })}
      <circle cx="40" cy="40" r="18" fill="#a8774f" stroke={INKC} strokeWidth="1.4" />
      <circle cx="40" cy="40" r="15" fill="#f1e6d0" stroke={INKC} strokeWidth="1.1" />
    </g>),
  },
  clkArch: {
    name: 'Terracotta arch clock', w: 46, h: 60, where: 'shelf', set: ['boho', 'plant'], c: [23, 25, 12], tk: 'dots', ink: '#5b3a26', hc: '#5b3a26', sc: '#d9a93f',
    body: () => (<g>
      <path d="M4 58V24Q4 4 23 4Q42 4 42 24V58Z" fill="#d98e6a" stroke={INKC} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 56V25Q8 9 23 8.5Q38 9 38 25V56" fill="none" stroke="#f1e6d0" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="23" cy="25" r="13.5" fill="#f1e6d0" stroke={INKC} strokeWidth="1.1" />
      <path d="M13 52A10 10 0 0 1 33 52Z" fill="#d9a93f" stroke={INKC} strokeWidth="1" />
      <path d="M16.5 52A6.5 6.5 0 0 1 29.5 52" fill="none" stroke="#f1e6d0" strokeWidth="1" />
    </g>),
  },
  // Digital (hh:mm) ones: scr = [text x, baseline y, font size], col = digit color.
  digHeart: {
    name: 'Heart digital clock', w: 64, h: 56, where: 'shelf', set: ['coquette'], dig: true, scr: [30, 33, 12], ap: [49.5, 25.6], col: '#c25a78', font: "'Patrick Hand', cursive",
    body: () => (<g>
      <path d="M32 54C14 42 3 31 3 19C3 9 11 3 19 3C25 3 29.5 6.5 32 11C34.5 6.5 39 3 45 3C53 3 61 9 61 19C61 31 50 42 32 54Z" fill="#f5c6d0" stroke={INKC} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 13C11.5 9 15 7 19 7" stroke="#fff" strokeWidth="2" opacity=".6" fill="none" strokeLinecap="round" />
      <rect x="13" y="19.5" width="38" height="18" rx="6" fill="#fffaf1" stroke={INKC} strokeWidth="1.2" />
      <circle cx="32" cy="45" r="2" fill="#e391a6" stroke={INKC} strokeWidth=".8" />
    </g>),
  },
  digSpell: {
    name: 'Witchy digital clock', w: 68, h: 50, where: 'shelf', set: ['witchy'], dig: true, scr: [32, 35, 13], ap: [54.5, 27.6], col: '#c9a6ff', glow: true, font: "Georgia, 'Times New Roman', serif",
    body: () => (<g>
      <path d="M4 48V20Q4 10 14 10H22Q34 0 46 10H54Q64 10 64 20V48Z" fill="#3b2a20" stroke={INKC} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 46V21Q8 14 15 14H23Q34 5 45 14H53Q60 14 60 21V46" fill="none" stroke="#d9b45a" strokeWidth="1" />
      <rect x="12" y="22" width="44" height="18" rx="3" fill="#1d1a26" stroke="#d9b45a" strokeWidth="1.1" />
      <path d={st4(34, 8, 2.6)} fill="#d9b45a" />
      {[[16, 44], [52, 44]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.4" fill="#d9b45a" />)}
    </g>),
  },
  digPot: {
    name: 'Plant pot digital clock', w: 56, h: 64, where: 'shelf', set: ['plant'], dig: true, scr: [26.5, 48.5, 11], ap: [41.6, 42.6], col: '#3b4a35', font: "'Patrick Hand', cursive",
    body: () => (<g>
      <path d="M28 26C28 18 26 13 22 9M28 26C28 17 31 11 36 7" stroke="#6f9a5c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="20" cy="9" rx="6" ry="3.2" transform="rotate(-35 20 9)" fill="#86b06f" stroke={INKC} strokeWidth="1.1" />
      <ellipse cx="38" cy="6.5" rx="6.4" ry="3.4" transform="rotate(25 38 6.5)" fill="#7fa66a" stroke={INKC} strokeWidth="1.1" />
      <ellipse cx="30" cy="16" rx="4.4" ry="2.4" transform="rotate(10 30 16)" fill="#9cc283" stroke={INKC} strokeWidth="1" />
      <path d="M8 31L13 61Q13.5 63 15.5 63H40.5Q42.5 63 43 61L48 31Z" fill="#d98c5f" stroke={INKC} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="5" y="25" width="46" height="8" rx="2.5" fill="#e09a6e" stroke={INKC} strokeWidth="1.5" />
      <rect x="13" y="37.5" width="30" height="15" rx="4" fill="#d9e8c4" stroke={INKC} strokeWidth="1.1" />
    </g>),
  },
  digBar: {
    name: 'Minimal digital clock', w: 76, h: 32, where: 'shelf', set: ['minimal'], dig: true, scr: [36, 21.5, 14], ap: [70, 12], col: '#3a3836', thin: true, font: "Nunito, system-ui, sans-serif",
    body: () => (<g>
      <rect x="2" y="3" width="72" height="26" rx="5" fill="#fbfaf7" stroke={INKC} strokeWidth="1.3" />
      <rect x="2" y="24" width="72" height="5" rx="2.5" fill={INKC} opacity=".07" />
    </g>),
  },
  digWood: {
    name: 'Wood block digital clock', w: 74, h: 38, where: 'shelf', set: ['boho', 'plant', 'cozy'], dig: true, scr: [36, 25, 15], ap: [67, 12.5], col: '#ffcf8a', glow: true, font: "'Patrick Hand', cursive",
    body: () => (<g>
      <rect x="2" y="3" width="70" height="32" rx="7" fill="#a8774f" stroke={INKC} strokeWidth="1.5" />
      {[10, 17, 26, 31].map((y, i) => <path key={y} d={`M6 ${y}Q${24 + i * 6} ${y - 2} 68 ${y + 1}`} stroke="#8a5f3c" strokeWidth=".8" fill="none" opacity=".7" />)}
      <rect x="2" y="29" width="70" height="6" rx="3" fill={INKC} opacity=".12" />
    </g>),
  },
};
Object.values(CLOCKS).forEach((d) => { d.live = true; d.set = [...d.set]; });
// Live calendars: they show today's date (and the witchy one shows tonight's moon).
const PH = "'Patrick Hand', cursive";
const MON = (n) => n.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
const MONL = (n) => n.toLocaleDateString(undefined, { month: 'long' });
const WK = (n) => n.toLocaleDateString(undefined, { weekday: 'long' });
const moonAge = (n) => { const d = (n.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5; return ((d % 29.530588) + 29.530588) % 29.530588 / 29.530588; };
const MOON_NAMES = ['new moon', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full moon', 'waning gibbous', 'last quarter', 'waning crescent'];
function moonPath(cx, cy, r, p) {
  const rx = Math.abs(Math.cos(2 * Math.PI * p)) * r, wax = p < 0.5;
  const inner = wax ? (p < 0.25 ? 0 : 1) : (p > 0.75 ? 1 : 0);
  return `M${cx} ${cy - r}A${r} ${r} 0 0 ${wax ? 1 : 0} ${cx} ${cy + r}A${rx.toFixed(2)} ${r} 0 0 ${inner} ${cx} ${cy - r}Z`;
}
const bowAt = (x, y, s, c, d) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-2 1L-7 12L-3 10.6L-.6 13Z M2 1L7 12L3 10.6L.6 13Z" fill={d} stroke={INKC} strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M0 0C-8 -9 -17 -6 -14.5 1.5C-13 6 -6 4.5 0 0Z M0 0C8 -9 17 -6 14.5 1.5C13 6 6 4.5 0 0Z" fill={c} stroke={INKC} strokeWidth="1.3" strokeLinejoin="round" />
    <rect x="-3.5" y="-3.5" width="7" height="7" rx="2.5" fill={d} stroke={INKC} strokeWidth="1.2" />
  </g>
);
const CALS = {
  calTear: {
    name: 'Bow tear-off calendar', w: 54, h: 64, where: 'wall', set: ['coquette', 'cozy'],
    draw: (n) => (<g>
      <rect x="5" y="12" width="44" height="50" rx="5" fill="#fffaf1" stroke={INKC} strokeWidth="1.5" />
      <path d="M5 17Q5 12 10 12H44Q49 12 49 17V25H5Z" fill="#f2b8c6" stroke={INKC} strokeWidth="1.5" />
      {[12, 20, 28, 36, 44].map((x) => <circle key={x} cx={x - 2} cy="15" r="1" fill="#fffaf1" />)}
      <text x="27" y="23" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#fff" style={{ fontFamily: PH, letterSpacing: '1px' }}>{MON(n)}</text>
      <text x="27" y="47" textAnchor="middle" fontSize="20" fontWeight="700" fill="#9c4a60" style={{ fontFamily: PH }}>{n.getDate()}</text>
      <text x="27" y="56" textAnchor="middle" fontSize="5.4" fill="#c97a8e" style={{ fontFamily: PH }}>{WK(n)}</text>
      <path d="M8 60.5Q27 62.5 46 60.5" stroke="#f2b8c6" strokeWidth="1" fill="none" strokeDasharray="1.6 1.6" />
      {bowAt(9, 13, 0.55, '#f5c6d0', '#e391a6')}
    </g>),
  },
  calMoon: {
    name: 'Moon phase calendar', main: '#d9b45a', w: 50, h: 64, where: 'shelf', set: ['witchy'],
    draw: (n) => { const p = moonAge(n); return (<g>
      <path d="M12 58L8 63M38 58L42 63" stroke="#3b2a20" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="4" y="3" width="42" height="56" rx="6" fill="#2b2a3a" stroke={INKC} strokeWidth="1.5" />
      <rect x="7" y="6" width="36" height="50" rx="4" fill="none" stroke="#d9b45a" strokeWidth=".9" />
      <circle cx="25" cy="21" r="10" fill="#4a4660" />
      <path d={moonPath(25, 21, 10, p)} fill="#f3e6c4" />
      <circle cx="25" cy="21" r="10" fill="none" stroke="#d9b45a" strokeWidth=".9" />
      {[[11, 10], [40, 13], [12, 30], [38, 30]].map(([x, y]) => <path key={x + '' + y} d={st4(x, y, 1.6)} fill="#d9b45a" />)}
      <text x="25" y="38" textAnchor="middle" fontSize="4.3" fill="#c9a6ff" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{MOON_NAMES[Math.round(p * 8) % 8]}</text>
      <text x="25" y="50.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#e9c46a" style={{ fontFamily: 'Georgia, serif' }}>{MON(n)} {n.getDate()}</text>
    </g>); },
  },
  calBoard: {
    name: 'Wooden hanging calendar', w: 56, h: 72, where: 'wall', set: ['plant', 'boho', 'cozy'],
    draw: (n) => (<g>
      <circle cx="28" cy="3" r="1.8" fill="#8a7a62" />
      <path d="M28 3L9 16M28 3L47 16" stroke="#c9b48c" strokeWidth="1" />
      <rect x="6" y="14" width="44" height="56" rx="4" fill="#b89068" stroke={INKC} strokeWidth="1.5" />
      <text x="28" y="22.5" textAnchor="middle" fontSize="6" fontWeight="700" fill="#fbf4ea" style={{ fontFamily: PH, letterSpacing: '1px' }}>{MONL(n)}</text>
      <rect x="10" y="26" width="36" height="40" rx="2" fill="#fbf4ea" stroke={INKC} strokeWidth="1" />
      <text x="28" y="51" textAnchor="middle" fontSize="21" fontWeight="700" fill="#3b4a35" style={{ fontFamily: PH }}>{n.getDate()}</text>
      <text x="28" y="61" textAnchor="middle" fontSize="5.4" fill="#5e8a52" style={{ fontFamily: PH }}>{WK(n)}</text>
      <path d="M8 16Q4 22 6 28" stroke="#6f9a5c" strokeWidth="1.2" fill="none" />
      {[[6.5, 20, -60], [4.6, 25, -110], [9, 17, -20]].map(([x, y, a]) => <ellipse key={x} cx={x} cy={y} rx="3.4" ry="1.8" transform={`rotate(${a} ${x} ${y})`} fill="#86b06f" stroke={INKC} strokeWidth=".8" />)}
    </g>),
  },
  calFlip: {
    name: 'Flip desk calendar', w: 52, h: 46, where: 'shelf', set: ['minimal'],
    draw: (n) => (<g>
      <path d="M4 44L8 34H44L48 44Z" fill="#d9d4cc" stroke={INKC} strokeWidth="1.3" strokeLinejoin="round" />
      <text x="26" y="42" textAnchor="middle" fontSize="4.6" fill="#5a5652" style={{ fontFamily: 'Nunito, sans-serif', letterSpacing: '.6px' }}>{MON(n)} · {WK(n).slice(0, 3).toUpperCase()}</text>
      <rect x="8" y="4" width="36" height="30" rx="3" fill="#fbfaf7" stroke={INKC} strokeWidth="1.3" />
      <path d="M8 19H44" stroke={INKC} strokeWidth=".8" opacity=".35" />
      <text x="26" y="27" textAnchor="middle" fontSize="20" fontWeight="300" fill="#2b2a2a" style={{ fontFamily: 'Nunito, sans-serif' }}>{String(n.getDate()).padStart(2, '0')}</text>
      {[14, 38].map((x) => <rect key={x} x={x - 1} y="1.5" width="2" height="5" rx="1" fill="#8a8580" />)}
    </g>),
  },
  calSun: {
    name: 'Sunny arch calendar', w: 46, h: 60, where: 'shelf', set: ['boho', 'plant'],
    draw: (n) => (<g>
      {Array.from({ length: 9 }, (_, i) => { const a = Math.PI + (i / 8) * Math.PI; return <path key={i} d={`M${23 + 20 * Math.cos(a)} ${22 + 20 * Math.sin(a)}L${23 + 24 * Math.cos(a)} ${22 + 24 * Math.sin(a)}`} stroke="#d9a93f" strokeWidth="2" strokeLinecap="round" />; })}
      <path d="M4 58V24Q4 5 23 5Q42 5 42 24V58Z" fill="#d98e6a" stroke={INKC} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 55V25Q8 10 23 9.5Q38 10 38 25V55Z" fill="#f1e6d0" stroke={INKC} strokeWidth="1" />
      <text x="23" y="21" textAnchor="middle" fontSize="5" fontWeight="700" fill="#c96f4a" style={{ fontFamily: PH, letterSpacing: '.8px' }}>{MONL(n).toUpperCase()}</text>
      <text x="23" y="41" textAnchor="middle" fontSize="18" fontWeight="700" fill="#5b3a26" style={{ fontFamily: PH }}>{n.getDate()}</text>
      <text x="23" y="50" textAnchor="middle" fontSize="5" fill="#a8774f" style={{ fontFamily: PH }}>{WK(n)}</text>
    </g>),
  },
  calMonth: {
    name: 'Month calendar', main: '#d98e6a', w: 70, h: 82, where: 'wall', set: ['coquette', 'plant', 'minimal', 'boho', 'cozy'],
    draw: (n, tint) => {
      const c = tint || '#d98e6a', y0 = n.getFullYear(), m0 = n.getMonth(), first = new Date(y0, m0, 1).getDay(), days = new Date(y0, m0 + 1, 0).getDate(), today = n.getDate();
      return (<g>
        <rect x="4" y="6" width="62" height="74" rx="4" fill="#fffaf1" stroke={INKC} strokeWidth="1.5" />
        <rect x="4" y="6" width="62" height="16" rx="4" fill={c} stroke={INKC} strokeWidth="1.5" />
        <rect x="5" y="17" width="60" height="5" fill={c} />
        <rect x="29" y="2" width="12" height="6" rx="2" fill="#b8b2a8" stroke={INKC} strokeWidth="1.1" />
        <text x="35" y="17.5" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#fff" style={{ fontFamily: PH }}>{MONL(n)} {y0}</text>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <text key={i} x={11 + i * 8} y="29" textAnchor="middle" fontSize="4" fontWeight="700" fill={c} style={{ fontFamily: 'Nunito, sans-serif' }}>{d}</text>)}
        {Array.from({ length: days }, (_, i) => {
          const idx = first + i, x = 11 + (idx % 7) * 8, y = 36.5 + Math.floor(idx / 7) * 7.6, on = i + 1 === today;
          return <g key={i}>{on && <circle cx={x} cy={y - 1.4} r="3.4" fill={c} />}<text x={x} y={y} textAnchor="middle" fontSize="4" fontWeight={on ? 700 : 400} fill={on ? '#fff' : '#5a4a40'} style={{ fontFamily: 'Nunito, sans-serif' }}>{i + 1}</text></g>;
        })}
      </g>);
    },
  },
  calMonthW: {
    name: 'Witchy moon month calendar', main: '#d9b45a', w: 70, h: 86, where: 'wall', set: ['witchy'],
    draw: (n) => {
      const y0 = n.getFullYear(), m0 = n.getMonth(), first = new Date(y0, m0, 1).getDay(), days = new Date(y0, m0 + 1, 0).getDate(), today = n.getDate();
      // Which days hold the new and full moon (closest day to each).
      const ph = Array.from({ length: days }, (_, i) => moonAge(new Date(y0, m0, i + 1, 21)));
      const near = (target) => ph.map((p, i) => [Math.min(Math.abs(p - target), 1 - Math.abs(p - target)), i]).filter(([dd]) => dd < 0.5 / 29.53).map(([, i]) => i);
      const full = new Set(near(0.5)), nw = new Set(near(0));
      const gold = '#d9b45a';
      return (<g>
        <path d="M30 4Q35 -1 40 4" stroke={gold} strokeWidth="1.2" fill="none" />
        <rect x="4" y="5" width="62" height="78" rx="5" fill="#2b2a3a" stroke={INKC} strokeWidth="1.5" />
        <rect x="7" y="8" width="56" height="72" rx="3" fill="none" stroke={gold} strokeWidth=".8" />
        <circle cx="35" cy="17" r="5" fill="#4a4660" /><path d={moonPath(35, 17, 5, moonAge(n))} fill="#f3e6c4" /><circle cx="35" cy="17" r="5" fill="none" stroke={gold} strokeWidth=".7" />
        {[[14, 14], [56, 14], [20, 22], [50, 22]].map(([x, y]) => <path key={x + '' + y} d={st4(x, y, 1.4)} fill={gold} />)}
        <text x="35" y="30.5" textAnchor="middle" fontSize="6.4" fill={gold} style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{MONL(n)} {y0}</text>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <text key={i} x={11 + i * 8} y="37.5" textAnchor="middle" fontSize="3.8" fill="#c9a6ff" style={{ fontFamily: 'Georgia, serif' }}>{d}</text>)}
        {Array.from({ length: days }, (_, i) => {
          const idx = first + i, x = 11 + (idx % 7) * 8, y = 44.5 + Math.floor(idx / 7) * 7, on = i + 1 === today;
          return <g key={i}>
            {on && <circle cx={x} cy={y - 1.3} r="3.3" fill="none" stroke={gold} strokeWidth=".9" />}
            {full.has(i) && <circle cx={x + 2.9} cy={y - 3.6} r="1.05" fill="#f3e6c4" />}
            {nw.has(i) && <circle cx={x + 2.9} cy={y - 3.6} r="1.05" fill="#1d1a26" stroke="#f3e6c4" strokeWidth=".4" />}
            <text x={x} y={y} textAnchor="middle" fontSize="3.9" fontWeight={on ? 700 : 400} fill={on ? gold : '#efe3cf'} style={{ fontFamily: 'Georgia, serif' }}>{i + 1}</text>
          </g>;
        })}
      </g>);
    },
  },
};
Object.values(CALS).forEach((d) => { d.live = true; });
Object.assign(LIVE, CALS);
Object.assign(LIVE, CLOCKS);
function ThemedClock({ k, now, hue }) {
  const d = CLOCKS[k], h = now.getHours(), m = now.getMinutes(), sec = now.getSeconds();
  if (d.dig) {
    const [x, y, fs] = d.scr, hh = ((h + 11) % 12) + 1;
    return recolor(
      <svg viewBox={`0 0 ${d.w} ${d.h}`} width="100%" height="100%" overflow="visible" aria-label={`${d.name}: ${hh}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`}>
        {d.body()}
        <text x={x} y={y} textAnchor="middle" fontSize={fs} fontWeight={d.thin ? 300 : 700} fill={d.col} style={{ fontFamily: d.font, letterSpacing: '.5px', filter: d.glow ? `drop-shadow(0 0 2px ${d.col})` : undefined }}>
          {String(hh).padStart(2, '0')}<tspan opacity={sec % 2 ? 0.3 : 1}>:</tspan>{String(m).padStart(2, '0')}
        </text>
        <text x={d.ap[0]} y={d.ap[1]} textAnchor="end" fontSize={Math.max(3.4, fs * 0.3)} fontWeight="700" fill={d.col} opacity=".7" style={{ fontFamily: 'Nunito, system-ui, sans-serif' }}>{h < 12 ? 'AM' : 'PM'}</text>
      </svg>, hue
    );
  }
  const [cx, cy, r] = d.c;
  const at = (deg, len) => [cx + len * Math.sin((deg * Math.PI) / 180), cy - len * Math.cos((deg * Math.PI) / 180)];
  const hand = (deg, len, wdt, col) => { const [x, y] = at(deg, len); return <line x1={cx} y1={cy} x2={x} y2={y} stroke={col} strokeWidth={wdt} strokeLinecap="round" />; };
  const tick = (i) => {
    const big = i % 3 === 0, [x0, y0] = at(i * 30, r * 0.84), [x1, y1] = at(i * 30, r * (big ? 0.66 : 0.74));
    if (d.tk === 'dots') return <circle key={i} cx={x0} cy={y0} r={r * (big ? 0.08 : 0.045)} fill={d.ink} />;
    if (d.tk === 'stars') return big ? <path key={i} d={st4(x0, y0, r * 0.13)} fill={d.ink} /> : <circle key={i} cx={x0} cy={y0} r={r * 0.04} fill={d.ink} />;
    if (d.tk === 'quarters') return big ? <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={d.ink} strokeWidth="1.6" strokeLinecap="round" /> : null;
    return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={d.ink} strokeWidth={big ? 1.5 : 0.9} strokeLinecap="round" />;
  };
  const tw = d.thin ? 0.7 : 1;
  return recolor(
    <svg viewBox={`0 0 ${d.w} ${d.h}`} width="100%" height="100%" overflow="visible" aria-label={`${d.name}: ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`}>
      {d.body()}
      {d.pend && <g style={{ transform: `rotate(${sec % 2 ? 9 : -9}deg)`, transformOrigin: `${d.pend[0]}px ${d.pend[1]}px`, transition: 'transform .95s ease-in-out' }}>
        <line x1={d.pend[0]} y1={d.pend[1]} x2={d.pend[0]} y2={d.pend[1] + d.pend[2]} stroke="#d9b45a" strokeWidth="1.2" />
        <circle cx={d.pend[0]} cy={d.pend[1] + d.pend[2]} r="3.4" fill="#d9b45a" stroke={INKC} strokeWidth="1" />
      </g>}
      {Array.from({ length: 12 }, (_, i) => tick(i))}
      {hand(((h % 12) + m / 60) * 30, r * 0.5, 2.6 * tw * (r / 20), d.hc)}
      {hand((m + sec / 60) * 6, r * 0.74, 1.8 * tw * (r / 20), d.hc)}
      {hand(sec * 6, r * 0.8, 0.8, d.sc)}
      <circle cx={cx} cy={cy} r={Math.max(1.4, r * 0.09)} fill={d.hc} />
      {d.over && d.over()}
    </svg>, hue
  );
}
const ALL = () => ({ ...LIVE, ...DECOR });
const D = (k) => LIVE[k] || DECOR[k];
function useNow() {
  const [n, setN] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setN(new Date()), 1000); return () => clearInterval(t); }, []);
  return n;
}
const shadeOf = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = (v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join(''); };
export function LiveClock({ k, tint, hue }) {
  const now = useNow();
  if (CLOCKS[k]) return <ThemedClock k={k} now={now} hue={hue} />;
  if (CALS[k]) { const d = CALS[k]; return <svg viewBox={`0 0 ${d.w} ${d.h}`} width="100%" height="100%" overflow="visible" aria-label={`${d.name}: ${now.toDateString()}`}>{recolor(d.draw(now, tint), hue, d.main)}</svg>; }
  const h = now.getHours(), m = now.getMinutes(), sec = now.getSeconds();
  if (k === 'liveDigital') {
    const c = tint || '#f3eee6';
    return (
      <svg viewBox="0 0 78 40" width="100%" height="100%" overflow="visible" aria-label={`Time ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`}>
        <rect x="2" y="2" width="74" height="34" rx="9" fill={c} stroke="#3d3121" strokeWidth="1.6" />
        <rect x="4" y="30" width="70" height="5" rx="2.5" fill={shadeOf(c, -0.15)} />
        <rect x="9" y="7" width="60" height="21" rx="5" fill="#2b2a2a" stroke="#3d3121" strokeWidth="1.2" />
        <text x="38" y="23.5" textAnchor="middle" fontSize="15" fontWeight="700" fill="#ffd27a" style={{ fontFamily: "'Patrick Hand', monospace", letterSpacing: '1px' }}>
          {((h + 11) % 12) + 1}<tspan opacity={sec % 2 ? 0.25 : 1}>:</tspan>{String(m).padStart(2, '0')}
        </text>
        <text x="64" y="14" textAnchor="end" fontSize="5.5" fill="#ffd27a" opacity=".8">{h < 12 ? 'AM' : 'PM'}</text>
        <rect x="8" y="36" width="8" height="3" rx="1.5" fill="#3d3121" /><rect x="62" y="36" width="8" height="3" rx="1.5" fill="#3d3121" />
      </svg>
    );
  }
  const c = tint || '#c99d74';
  const hand = (deg, len, wdt, col) => <line x1="32" y1="32" x2={32 + len * Math.sin((deg * Math.PI) / 180)} y2={32 - len * Math.cos((deg * Math.PI) / 180)} stroke={col} strokeWidth={wdt} strokeLinecap="round" />;
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" overflow="visible" aria-label={`Time ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`}>
      <circle cx="32" cy="32" r="30" fill={c} stroke="#3d3121" strokeWidth="1.6" />
      <circle cx="32" cy="32" r="30" fill="none" stroke={shadeOf(c, 0.35)} strokeWidth="2" strokeDasharray="30 160" transform="rotate(200 32 32)" />
      <circle cx="32" cy="32" r="24" fill="#fffaf1" stroke="#3d3121" strokeWidth="1.3" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1="32" y1={i % 3 ? 10.5 : 10} x2="32" y2={i % 3 ? 12.5 : 14} stroke="#3d3121" strokeWidth={i % 3 ? 1 : 1.8} strokeLinecap="round" transform={`rotate(${i * 30} 32 32)`} />)}
      {hand(((h % 12) + m / 60) * 30, 12, 2.6, '#3d3121')}
      {hand((m + sec / 60) * 6, 17, 1.8, '#3d3121')}
      {hand(sec * 6, 18, 0.8, '#c95a55')}
      <circle cx="32" cy="32" r="2" fill="#3d3121" />
    </svg>
  );
}

/* ---------- room looks ---------- */
const SHELF_WOODS = ['#f3ebe4', '#d9c2a3', '#b89068', '#a8774f', '#8a6a4f', '#5e4636', '#4a3328', '#3a3633', '#f2b8c6', '#a9b89a', '#8fa8bf', '#b9a3cf'];
const WALLS = ['#f6dfe3', '#fbeef0', '#ecd6c0', '#f1eee8', '#fffaf2', '#dfe7d6', '#cfdcc6', '#dbe4ee', '#e6dcf0', '#f3e2b8', '#2f3a33', '#2b2a3a', '#4a2f35', '#3a3633'];
const FLOORS = ['#e9d3c0', '#d9c2a3', '#c99d74', '#a8774f', '#6e4c35', '#4a3426', '#e3dcd1', '#f3eee6', '#c9c4bb', '#8a8580', '#c9d6b8', '#f7c9d4'];
const TRIMS = ['#ffffff', '#fbf4ea', '#e9d3c0', '#c99d74', '#6e4c35', '#3a3633', '#f2b8c6', '#a9b89a', '#b8933d'];
const WALLPAPERS = [['none', 'Plain'], ['stripes', 'Stripes'], ['damask', 'Damask'], ['leafy', 'Leafy'], ['arches', 'Arches'], ['dots', 'Dots'], ['gingham', 'Gingham'], ['wainscot', 'Wainscot']];
const FLOOR_STYLES = [['planks', 'Planks'], ['herring', 'Herringbone'], ['checker', 'Checker tile'], ['carpet', 'Carpet']];
const inkFor = (hex) => { const n = parseInt(hex.slice(1), 16), L = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; return L < 0.5 ? '#efe3cf' : '#4a3a33'; };
// A row of color dots for the selection bar: ↺ = original, then presets, then "any color".
function SwRow({ list, value, onPick, label, bgOf }) {
  return (
    <span className="rpots" title={label}>
      {[undefined, ...list].map((c) => <button key={c || 'def'} className={'sw' + (value === c ? ' on' : '') + (c ? '' : ' auto')} style={{ background: (bgOf && bgOf(c)) || c || 'transparent' }} aria-label={c ? label + ' ' + c : 'Original ' + label.toLowerCase()} onClick={() => onPick(c)}>{c ? '' : '↺'}</button>)}
      <label className={'sw custom' + (value && !list.includes(value) ? ' on' : '')} title="Pick any color" style={value && !list.includes(value) && value.startsWith('#') ? { background: value } : undefined}><input type="color" value={value && value.startsWith('#') ? value : '#c98a6a'} onChange={(e) => onPick(e.target.value)} aria-label={'Any ' + label.toLowerCase() + ' color'} /></label>
    </span>
  );
}
const ANY_COLORS = ['#f2b8c6', '#e391a6', '#c96f4a', '#d9a93f', '#efe4cc', '#a9b89a', '#5e8a52', '#8fa8bf', '#3f4a6a', '#b9a3cf', '#5b3a5e', '#7a2e35', '#3a3633', '#f4f1ea'];
function Swatches({ list, value, onPick }) {
  return (
    <div className="swatches rsw">
      {list.map((c) => <button key={c} className={'sw' + (value === c ? ' on' : '')} style={{ background: c }} aria-label={c} onClick={() => onPick(c)} />)}
      <label className="sw custom" title="Pick any color"><input type="color" value={value || '#ffffff'} onChange={(e) => onPick(e.target.value)} aria-label="Custom color" /></label>
    </div>
  );
}

/* ---------- decor groups (for the panel) ---------- */
const GROUPS = [['Furniture'], ['Clocks & calendars'], ['Plants'], ['Cats'], ['Lights & candles'], ['Wall'], ['Rugs & cushions'], ['Shelf things']];
function groupOf(k, d) {
  if (d.live || /clock/i.test(k)) return 'Clocks & calendars';
  if (d.tints) return 'Furniture';
  if (/^(tabby|tortie|cat)|Cat$/.test(k)) return 'Cats';
  if (d.lights || /light|lamp|candle|candlestick|lantern/i.test(k)) return 'Lights & candles';
  if (d.pots || /plant|ivy|sprout|cactus|succulent|pampas|terrarium|propagation|fig|monstera|pothos|pearls/i.test(k)) return 'Plants';
  if (d.where === 'wall') return 'Wall';
  if (/rug|cushion|pillow|pouf/i.test(k) || d.where === 'floor') return 'Rugs & cushions';
  return 'Shelf things';
}

/* ---------- the room ---------- */
export default function Room({ settings, update, children, header, deps }) {
  const room = settings.room || {};
  const th = THEMES[room.theme] ? room.theme : null;
  const items = room.items || [];
  const win = { x: 18, y: 36, sc: 1.15, ...(room.win || {}) };
  const [edit, setEdit] = useState(false);
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState('decor');
  const [drag, setDrag] = useState(null);
  const [mini, setMini] = useState(false); // tuck the decorate panel away to see the whole room
  const [big, setBig] = useState(false); // or open it up wide to browse
  const [side, setSide] = useState(() => { try { return localStorage.getItem('rdside') || 'right'; } catch { return 'right'; } }); // PC: which side the panel floats on
  const flipSide = () => setSide((v) => { const n = v === 'left' ? 'right' : 'left'; try { localStorage.setItem('rdside', n); } catch { /* fine */ } return n; });
  const [dq, setDq] = useState('');
  const [df, setDf] = useState('room');
  const scene = useRef(), wrap = useRef(), stage = useRef();
  const [sh, setSh] = useState(0);
  const z = useFit(wrap, sh);
  // The bookcase can scoot left/right (stage px of its left edge; 280 = the original spot).
  const bcx = room.bcx ?? 280, clampBc = (v) => Math.round(Math.min(390, Math.max(10, v)));
  const bcLive = drag?.id === 'bc' ? clampBc(bcx + drag.dx) : bcx;
  const b = useBoxes(stage, z, [items.length, th, edit, bcLive, ...(deps || [])]);
  const touching = useRef(new Set());
  // The selection bar hops to the top of the screen when the thing you picked is low (floor decor), so it never covers it.
  const [barTop, setBarTop] = useState(false);
  useLayoutEffect(() => {
    if (!edit || !sel) return;
    const f = () => { const el = stage.current?.querySelector('.rdec.on, .rwinbox.on, .bookcase.on'); if (!el) return; const R = el.getBoundingClientRect(), dr = document.querySelector('.rdrawer'), vis = dr && innerWidth < 900 ? dr.getBoundingClientRect().top : innerHeight; setBarTop((Math.max(0, R.top) + Math.min(vis, R.bottom)) / 2 > vis * 0.5); };
    f(); addEventListener('scroll', f, true); addEventListener('resize', f);
    return () => { removeEventListener('scroll', f, true); removeEventListener('resize', f); };
  }, [edit, sel, items, drag, z]);
  useLayoutEffect(() => {
    const el = stage.current; if (!el) return;
    const m = () => setSh(el.offsetHeight);
    m(); const ro = new ResizeObserver(m); ro.observe(el); return () => ro.disconnect();
  }, [th]);
  const wx = useWeather();
  const save = (patch) => update((s) => ({ room: { ...(s.room || {}), ...patch } }));
  // Every change is remembered so Undo (button or Ctrl+Z) can step back.
  const hist = useRef([]);
  const setItems = (fn) => update((s) => { const before = upgradeOld(s.room); hist.current = [...hist.current.slice(-40), before]; return { room: { ...(s.room || {}), v: 3, items: fn(before) } }; });
  const undo = () => { const prev = hist.current.pop(); if (prev) update((s) => ({ room: { ...(s.room || {}), v: 3, items: prev } })); };
  // One-time move of older saves onto the stage.
  useEffect(() => { if (th && items.length && room.v !== 3) save({ v: 3, items: upgradeOld(room) }); }, [th, room.v]);
  const pick = (key) => {
    if (key === th) return;
    const keep = items.length && !confirm(`Switch to ${THEMES[key].name}?\n\nOK = use this theme's decor too\nCancel = keep your decor, just change the room`);
    save({ theme: key, v: 3, look: {}, ...(keep ? {} : { items: starter(key) }) });
    if (settings.shelfColor == null || !keep) update({ shelfColor: THEMES[key].shelf });
  };
  const addDecor = (k) => {
    const d = D(k), id = 'd' + Date.now().toString(36);
    const a = isStrand(k) ? { t: 'case' } : d.where === 'wall' ? { t: 'wall', x: 930, y: 60 } : d.where === 'floor' ? { t: 'floor', x: 930, y: 0 } : { t: 'row', r: 0, x: 0.9, y: 0 };
    setItems((l) => [...l, { id, k, sc: 1, z: Math.max(0, ...l.map((x) => x.z || 0)) + 1, a }]);
    setSel(id);
  };
  const patch = (id, p) => setItems((l) => l.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const cur = items.find((x) => x.id === sel);
  // Copy sits just beside the original (same shelf, wall or floor) and becomes the selection.
  const dup = (it) => {
    const id = 'd' + Date.now().toString(36), a = it.a;
    const na = a.t === 'row' ? { ...a, x: Math.min(1, a.x + 0.09) } : { ...a, x: a.x + 40, ...(a.t === 'wall' ? { y: a.y + 20 } : {}) };
    setItems((l) => [...l, { ...it, id, a: na, z: Math.max(0, ...l.map((x) => x.z || 0)) + 1 }]);
    setSel(id);
  };
  const remove = (id) => { setItems((l) => l.filter((x) => x.id !== id)); setSel(null); };
  // Keyboard on PC: Delete removes, Ctrl+D copies, arrows nudge (Shift = bigger steps), Esc lets go, Ctrl+Z undoes.
  useEffect(() => {
    if (!edit) return;
    const key = (e) => {
      if (e.target.closest?.('input,textarea,select')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
      if (!cur) { if (e.key === 'Escape') setSel(null); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(cur.id); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); dup(cur); }
      else if (e.key === 'Escape') setSel(null);
      else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const st = e.shiftKey ? 20 : 4, a = cur.a, dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, dy = e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0;
        patch(cur.id, { a: a.t === 'row' ? { ...a, x: Math.min(1, Math.max(0, a.x + dx / 600)) } : a.t === 'floor' ? { ...a, x: a.x + dx, y: (a.y || 0) - dy } : { ...a, x: a.x + dx, y: a.y + dy } });
      }
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  });

  // Drag on the stage: pointer moves are divided by the stage scale so a spot stays a spot.
  const dragOn = (e, id, done) => {
    if (!edit) return;
    e.preventDefault(); e.stopPropagation(); setSel(id);
    const x0 = e.clientX, y0 = e.clientY;
    let moved = false;
    const mv = (ev) => { if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return; moved = true; setDrag({ id, dx: (ev.clientX - x0) / z, dy: (ev.clientY - y0) / z }); };
    const up = (ev) => {
      removeEventListener('pointermove', mv); removeEventListener('pointerup', up); setDrag(null);
      if (moved) done((ev.clientX - x0) / z, (ev.clientY - y0) / z);
    };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  };
  // A preset sets everything; your own wall / wallpaper / floor / trim picks sit on top of it.
  const look = room.look || {};
  const t = th ? { ...THEMES[th], ...Object.fromEntries(Object.entries(look).filter(([, v]) => v != null)) } : null;
  const setLook = (p) => save({ look: { ...look, ...p } });
  const shelfColor = settings.shelfColor || '#8a6a4f';
  const dg = (id) => (drag && drag.id === id ? drag : { dx: 0, dy: 0 });
  const decorOf = (list) => b && [...list].sort((x, y) => (x.z || 0) - (y.z || 0)).map((it) => {
    const p = place(it, b); if (!p) return null;
    const d = dg(it.id);
    return (
      <div key={it.id} className={'rdec' + (edit ? ' edit' : '') + (sel === it.id && edit ? ' on' : '')} title={edit ? D(it.k).name : undefined}
        style={{ left: p.left + d.dx + (drag?.id === 'bc' && touching.current.has(it.id) ? bcLive - bcx : 0), top: p.top + d.dy, width: p.w, height: p.h, zIndex: (it.a.t === 'wall' ? 1 : 3) + (it.z || 0) / 1000 }}
        onPointerDown={(e) => dragOn(e, it.id, (dx, dy) => { const L = p.left + dx, T = p.top + dy; patch(it.id, { a: anchorAt(L + p.w / 2, T + p.h, T, b, it) }); })}>
        {D(it.k).live ? <LiveClock k={it.k} tint={it.tint} hue={it.hue} /> : it.a.t === 'case' ? <div className="rcase2"><DecorArt k={it.k} light={it.light} pot={it.pot} tint={it.tint} acc={it.acc} wax={it.wax} hue={it.hue} /><DecorArt k={it.k} flip light={it.light} pot={it.pot} tint={it.tint} acc={it.acc} wax={it.wax} hue={it.hue} /></div> : <DecorArt k={it.k} flip={it.flip} pot={it.pot} tint={it.tint} acc={it.acc} light={it.light} wax={it.wax} hue={it.hue} />}
      </div>
    );
  });
  const decor = decorOf(items.filter((it) => !it.behind)), decorBack = decorOf(items.filter((it) => it.behind));
  const wd = dg('win');
  // Wall and floor decor overlapping the bookcase moves with it (shelf decor already rides along).
  const touchingNow = () => {
    if (!b?.bc) return new Set();
    const L = b.bc.l, R = L + b.bc.w, T = b.bc.top, B = b.floor + 10;
    return new Set(items.filter((it) => it.a.t === 'wall' || it.a.t === 'floor').filter((it) => { const p = place(it, b); return p && p.left < R && p.left + p.w > L && p.top < B && p.top + p.h > T; }).map((it) => it.id));
  };
  const moveBc = (to, ids = touchingNow()) => {
    const nx = clampBc(to), dx = nx - bcx; if (!dx) return;
    save({ bcx: nx, items: items.map((it) => (ids.has(it.id) ? { ...it, a: { ...it.a, x: Math.round(it.a.x + dx) } } : it)) });
  };

  return (
    <div ref={scene} className={'roomscene' + (t ? ' themed p-' + t.pat + ' f-' + (t.fl || 'planks') : '') + (edit ? ' editing' : '')}
      style={t ? { '--wall': t.wall, '--rink': t.ink, '--floor': t.floor, '--rug': t.rug, '--trim': t.trim || `color-mix(in srgb, ${t.floor} 70%, #fff)` } : undefined}
      onPointerDown={(e) => { if (edit && (e.target === e.currentTarget || e.target.classList?.contains('rstage'))) setSel(null); }}>
      {header({ onDecorate: () => { setEdit(true); if (!th) setTab('themes'); }, editing: edit })}
      {!t ? <div className="bookcase" style={{ '--s': settings.shelfColor || '#8a6a4f' }}>{children}</div> : (
        <div ref={wrap} className="rstagewrap" style={{ height: sh * z }}>
          <div ref={stage} className="rstage" style={{ width: SW, transform: `translateX(-50%) scale(${z})` }}>
            <div className="rwall" style={{ height: 3000 + (b?.floor ?? sh - 130) }} />
            {room.window !== false && (
              <div className={'rwinbox' + (edit ? ' edit' : '') + (sel === 'win' && edit ? ' on' : '')} style={{ left: win.x + wd.dx, top: win.y + wd.dy, width: 210 * win.sc }}
                onPointerDown={(e) => dragOn(e, 'win', (dx, dy) => save({ win: { ...win, x: Math.round(win.x + dx), y: Math.round(win.y + dy) } }))}>
                <WeatherWindow wx={wx} th={th} t={t} />
              </div>
            )}
            <div className={'bookcase' + (edit ? ' bcedit' : '') + (edit && sel === 'bc' ? ' on' : '')} style={{ '--s': settings.shelfColor || '#8a6a4f', left: bcLive - 280 }}
              onClickCapture={(e) => { if (edit) { e.preventDefault(); e.stopPropagation(); } }}
              onPointerDown={(e) => { if (!edit) return; touching.current = touchingNow(); dragOn(e, 'bc', (dx) => moveBc(bcx + dx, touching.current)); }}>{children}</div>
            <div className="rfloor" />
            <div className="rdecor rback">{decorBack}</div>
            <div className="rdecor">{decor}</div>
          </div>
        </div>
      )}

      {edit && sel === 'bc' && (
        <div className={'rselbar' + (mini ? ' low' : '') + (barTop ? ' top' : '')} onPointerDown={(e) => e.stopPropagation()}>
          <b>Bookshelf</b>
          <button className="mini" aria-label="Scoot left" onClick={() => moveBc(bcx - 20)}>← Left</button>
          <button className="mini" aria-label="Scoot right" onClick={() => moveBc(bcx + 20)}>Right →</button>
          <button className="mini" onClick={() => moveBc(280)}>Reset spot</button>
          <small className="rselhint">Drag it, or nudge. Decor on or touching it comes along.</small>
        </div>
      )}
      {edit && sel === 'win' && (
        <div className={'rselbar' + (mini ? ' low' : '') + (barTop ? ' top' : '')} onPointerDown={(e) => e.stopPropagation()}>
          <b>Window</b>
          <button className="mini" aria-label="Smaller" onClick={() => save({ win: { ...win, sc: Math.max(0.6, +(win.sc - 0.1).toFixed(2)) } })}>−</button>
          <button className="mini" aria-label="Bigger" onClick={() => save({ win: { ...win, sc: Math.min(2.2, +(win.sc + 0.1).toFixed(2)) } })}>+</button>
          <button className="mini" onClick={() => save({ win: null })}>Reset</button>
          <button className="mini danger" onClick={() => { save({ window: false }); setSel(null); }}>Hide</button>
        </div>
      )}
      {edit && cur && (
        <div className={'rselbar' + (mini ? ' low' : '') + (barTop ? ' top' : '')} onPointerDown={(e) => e.stopPropagation()}>
          <b>{D(cur.k)?.name}</b>
          <button className="mini" aria-label="Smaller" onClick={() => patch(cur.id, { sc: Math.max(0.4, +(cur.sc - 0.15).toFixed(2)) })}>−</button>
          <button className="mini" aria-label="Bigger" onClick={() => patch(cur.id, { sc: Math.min(3, +(cur.sc + 0.15).toFixed(2)) })}>+</button>
          {D(cur.k)?.tints && <SwRow label="Color" list={FURN_COLORS} value={cur.tint} onPick={(c) => patch(cur.id, { tint: c })} />}
          {D(cur.k)?.fab && <SwRow label="Color" list={RUG_COLORS} value={cur.tint} onPick={(c) => patch(cur.id, { tint: c })} />}
          {D(cur.k)?.lights && <SwRow label="Lights" list={LIGHT_COLORS} value={cur.light} onPick={(c) => patch(cur.id, { light: c })} bgOf={(c) => (c === 'rainbow' ? 'conic-gradient(#ffb3c7,#ffe6a3,#b8e0a0,#a8d8ff,#c9b2f2,#ffb3c7)' : null)} />}
          {D(cur.k)?.wax && <SwRow label="Candle" list={WAX_COLORS} value={cur.wax} onPick={(c) => patch(cur.id, { wax: c })} />}
          {!D(cur.k)?.tints && !D(cur.k)?.fab && !D(cur.k)?.lights && !D(cur.k)?.wax && !D(cur.k)?.pots && <SwRow label="Color" list={ANY_COLORS} value={cur.hue} onPick={(c) => patch(cur.id, { hue: c })} />}
          {D(cur.k)?.accs && (
            <select className="racc" value={cur.acc || ''} onChange={(e) => patch(cur.id, { acc: e.target.value || undefined })} aria-label="Accessory">
              <option value="">No accessory</option>
              {ACC_STYLES.map(([v, l]) => <option key={v} value={v}>{l} dress-up</option>)}
            </select>
          )}
          {D(cur.k)?.pots && <SwRow label="Pot" list={POT_COLORS} value={cur.pot} onPick={(c) => patch(cur.id, { pot: c })} />}
          <button className="mini" onClick={() => patch(cur.id, { flip: !cur.flip })}>Flip</button>
          <button className="mini" onClick={() => patch(cur.id, { z: Math.max(0, ...items.map((x) => x.z || 0)) + 1 })}>Front</button>
          <button className="mini" onClick={() => patch(cur.id, { z: Math.min(0, ...items.map((x) => x.z || 0)) - 1 })}>Back</button>
          {isStrand(cur.k) && (cur.a.t === 'case'
            ? <button className="mini" onClick={() => patch(cur.id, { a: { t: 'wall', x: Math.round((b?.bc?.l || 280) + (b?.bc?.w || 600) / 2), y: Math.round((b?.bc?.top || 140) - 60) } })}>Unpin from shelf</button>
            : <button className="mini" onClick={() => patch(cur.id, { a: { t: 'case' } })}>Fit to bookshelf</button>)}
          {cur.a.t !== 'row' && cur.a.t !== 'case' && (cur.behind || touchingNow().has(cur.id)) && <button className="mini" onClick={() => patch(cur.id, { behind: !cur.behind || undefined })}>{cur.behind ? 'In front of shelf' : 'Behind shelf'}</button>}
          <button className="mini" onClick={() => dup(cur)} title="Ctrl+D">Duplicate</button>
          <button className="mini danger" onClick={() => remove(cur.id)} title="Delete key">Remove</button>
        </div>
      )}
      {edit && (
        <section className={'rdrawer' + (mini ? ' min' : big ? ' big' : '') + (side === 'left' ? ' left' : '')} aria-label="Decorate your room" onPointerDown={(e) => e.stopPropagation()}>
          <div className="prow">
            <div className="segs">
              <button className={tab === 'themes' ? 'on' : ''} onClick={() => setTab('themes')}>Room</button>
              <button className={tab === 'decor' ? 'on' : ''} onClick={() => setTab('decor')} disabled={!th}>Decor</button>
            </div>
            <button className="mini" onClick={() => setMini((v) => !v)}>{mini ? '▴ Show' : '▾ Hide'}</button>
            {!mini && <button className="mini" onClick={() => setBig((v) => !v)}>{big ? '⤡ Smaller' : '⤢ Bigger'}</button>}
            <button className="mini pconly" onClick={flipSide} title="Move this panel to the other side">{side === 'left' ? 'Switch side ⇢' : '⇠ Switch side'}</button>
            <button className="mini" onClick={undo} title="Ctrl+Z">↶ Undo</button>
            <button className="btn primary" onClick={() => { setEdit(false); setSel(null); setMini(false); }}>Done</button>
          </div>
          {tab === 'themes' && (
            <>
              <div className="lbl rlbl">ROOM PRESETS</div>
              <div className="rthemes">
                {Object.entries(THEMES).map(([key, x]) => (
                  <button key={key} className={'rtheme' + (th === key ? ' on' : '')} onClick={() => pick(key)}>
                    <span className={'rthumb p-' + x.pat} style={{ '--wall': x.wall, '--floor': x.floor }}><i style={{ background: x.shelf }} /><b style={{ background: x.curtain }} /></span>
                    <small>{x.name}</small>
                  </button>
                ))}
                {th && <button className="rtheme" onClick={() => { save({ theme: null }); }}><span className="rthumb plain" /><small>Plain (no room)</small></button>}
              </div>
              <div className="rlook">
                <div className="lbl rlbl">BOOKSHELF</div>
                <Swatches list={SHELF_WOODS} value={shelfColor} onPick={(c) => update({ shelfColor: c })} />
                {th && <>
                  <div className="lbl rlbl">WALL</div>
                  <Swatches list={WALLS} value={t.wall} onPick={(c) => setLook({ wall: c, ink: inkFor(c) })} />
                  <div className="rchips">{WALLPAPERS.map(([v, l]) => <button key={v} className={'libtag' + (t.pat === v ? ' on' : '')} onClick={() => setLook({ pat: v })}>{l}</button>)}</div>
                  <div className="lbl rlbl">FLOOR</div>
                  <Swatches list={FLOORS} value={t.floor} onPick={(c) => setLook({ floor: c })} />
                  <div className="rchips">{FLOOR_STYLES.map(([v, l]) => <button key={v} className={'libtag' + ((t.fl || 'planks') === v ? ' on' : '')} onClick={() => setLook({ fl: v })}>{l}</button>)}</div>
                  <div className="lbl rlbl">TRIM <small style={{ opacity: 0.7, fontWeight: 400 }}>· baseboard and window frame</small></div>
                  <Swatches list={TRIMS} value={t.trim} onPick={(c) => setLook({ trim: c })} />
                  <div className="lbl rlbl">WINDOW</div>
                  <div className="rchips">{WINDOW_SHAPES.map(([v, l]) => <button key={v} className={'libtag' + ((t.wshape || 'round') === v ? ' on' : '')} onClick={() => setLook({ wshape: v })}>{l}</button>)}</div>
                  <div className="lbl rlbl">CURTAINS</div>
                  <div className="rchips">{CURTAIN_STYLES.map(([v, l]) => <button key={v} className={'libtag' + ((t.cstyle || 'drape') === v ? ' on' : '')} onClick={() => setLook({ cstyle: v })}>{l}</button>)}</div>
                  {t.cstyle !== 'none' && <Swatches list={CURTAIN_COLORS} value={t.curtain} onPick={(c) => setLook({ curtain: c })} />}
                  {Object.keys(look).length > 0 && <button className="mini" style={{ marginTop: 10 }} onClick={() => save({ look: {} })}>Reset to {THEMES[th].name} preset</button>}
                </>}
              </div>
              {th && <label className="toggle" style={{ marginTop: 8 }}><input type="checkbox" checked={room.window !== false} onChange={(e) => save({ window: e.target.checked })} /><span>Weather window (uses this device’s location) — tap it to move or resize</span></label>}
              {th && room.window !== false && (
                <div className="rlook">
                  <div className="lbl rlbl">WEATHER TAG</div>
                  <div className="rchips">{WX_STYLES.map(([v, l]) => <button key={v} className={'libtag' + ((t.wxs || th) === v ? ' on' : '')} onClick={() => setLook({ wxs: v })}>{l}</button>)}</div>
                  {(t.wxs || th) !== 'off' && <>
                    <div className="lbl rlbl">TAG COLOR</div>
                    <Swatches list={WX_BGS} value={t.wxbg} onPick={(c) => setLook({ wxbg: c })} />
                    <div className="lbl rlbl">TEXT COLOR</div>
                    <Swatches list={WX_FGS} value={t.wxfg} onPick={(c) => setLook({ wxfg: c })} />
                    {(t.wxbg || t.wxfg) && <button className="mini" onClick={() => setLook({ wxbg: null, wxfg: null })}>Use the style’s colors</button>}
                    <div className="lbl rlbl">FONT</div>
                    <div className="rchips">{WX_FONT_LIST.map(([v, l]) => <button key={v} className={'libtag' + (t.wxfont === v ? ' on' : '')} style={{ fontFamily: WX_FONTS[v] }} onClick={() => setLook({ wxfont: t.wxfont === v ? null : v })}>{l}</button>)}</div>
                    <div className="lbl rlbl">WORDS</div>
                    <div className="rchips">{WX_WORDS.map(([v, l]) => <button key={v} className={'libtag' + ((t.wxsay || th) === v ? ' on' : '')} onClick={() => setLook({ wxsay: v })}>{l}</button>)}</div>
                    {t.wxsay === 'custom' && <input className="rwxtext" value={t.wxtext || ''} maxLength={40} placeholder="e.g. hello there ♡" onChange={(e) => setLook({ wxtext: e.target.value })} aria-label="Your own weather words" />}
                    <div className="lbl rlbl">LITTLE ICON</div>
                    <div className="rchips">{WX_MARKS.map((m) => <button key={m || 'none'} className={'libtag' + ((t.wxmark != null ? t.wxmark : MARK[t.wxs || th] || '') === m ? ' on' : '')} onClick={() => setLook({ wxmark: m })}>{m || 'None'}</button>)}</div>
                    <div className="rchips" style={{ marginTop: 10 }}>
                      <button className={'libtag' + (t.wxunit !== 'C' ? ' on' : '')} onClick={() => setLook({ wxunit: 'F' })}>°F</button>
                      <button className={'libtag' + (t.wxunit === 'C' ? ' on' : '')} onClick={() => setLook({ wxunit: 'C' })}>°C</button>
                      <button className={'libtag' + (t.wxhl !== false ? ' on' : '')} onClick={() => setLook({ wxhl: t.wxhl === false ? null : false })}>High / low</button>
                      <button className={'libtag' + (t.wxplace !== false ? ' on' : '')} onClick={() => setLook({ wxplace: t.wxplace === false ? null : false })}>Town name</button>
                      <button className={'libtag' + (t.wxdate ? ' on' : '')} onClick={() => setLook({ wxdate: t.wxdate ? null : true })}>Today’s date</button>
                    </div>
                  </>}
                </div>
              )}
            </>
          )}
          {tab === 'decor' && th && (
            <>
              <p className="hint" style={{ margin: '6px 0' }}>Tap to add, then drag it anywhere. On PC: Delete removes, Ctrl+D copies, arrow keys nudge, Ctrl+Z undoes.</p>
              <div className="rdecfilter">
                <input value={dq} onChange={(e) => setDq(e.target.value)} placeholder="Search decor" aria-label="Search decor" />
                <button className={'libtag' + (df === 'room' ? ' on' : '')} onClick={() => setDf(df === 'room' ? 'all' : 'room')}>{df === 'room' ? '✓ This room’s style' : 'All styles'}</button>
                {GROUPS.map(([g]) => <button key={g} className="libtag" onClick={() => document.getElementById('rg-' + g)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{g}</button>)}
              </div>
              {(() => {
                const q = dq.trim().toLowerCase();
                const list = Object.entries(ALL()).filter(([k, d]) => (!q || (d.name + ' ' + k + ' ' + (d.set || []).join(' ')).toLowerCase().includes(q)) && (df === 'all' || q || d.set?.includes(th) || d.tints || d.set?.includes('cozy')));
                const by = {};
                for (const e of list) (by[groupOf(e[0], e[1])] ||= []).push(e);
                const shown = GROUPS.filter(([g]) => by[g]?.length);
                if (!shown.length) return <p className="hint">Nothing matches — try All styles.</p>;
                return shown.map(([g]) => (
                  <div key={g} id={'rg-' + g} className="rdecsec">
                    <div className="lbl">{g.toUpperCase()}</div>
                    <div className="rdecgrid">
                      {by[g].sort(([, a], [, z]) => (z.set?.includes(th) ? 1 : 0) - (a.set?.includes(th) ? 1 : 0)).map(([k, d]) => (
                        <button key={k} className="rdecpick" onClick={() => addDecor(k)} title={d.name} aria-label={'Add ' + d.name}>
                          <span>{d.live ? <LiveClock k={k} /> : <DecorArt k={k} />}</span><small>{d.name}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </>
          )}
        </section>
      )}
    </div>
  );
}

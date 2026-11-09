import { BUILTIN } from './stickerArt';
import { stickerUrl } from './stickerPacks';
import { pathFor, inkOrder } from './geom';

// One sticker's artwork, filling whatever box it sits in.
export function Art({ st }) {
  if (st.src === 'pack') return <img src={stickerUrl(st.key)} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />;
  if (st.src === 'builtin') return <svg viewBox="0 0 100 100" width="100%" height="100%" overflow="visible" dangerouslySetInnerHTML={{ __html: BUILTIN[st.key] || '' }} />;
  if (st.src === 'text') return (
    <svg viewBox={`0 0 ${Math.max(40, st.text.length * 15 + 16)} 34`} width="100%" height="100%" overflow="visible">
      <text x="50%" y="25" textAnchor="middle" fontSize="27" fill={st.color} style={{ fontFamily: `'${st.font}', cursive` }} stroke="rgba(0,0,0,.18)" strokeWidth=".5" paintOrder="stroke">{st.text}</text>
    </svg>
  );
  if (st.src === 'washi') return <span className={'washi w-' + (st.p || 'plain')} style={{ '--w': st.color }} />;
  if (st.src === 'image') return <img src={st.url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />;
  return (
    <svg viewBox={`0 0 ${st.w0} ${st.h0}`} width="100%" height="100%" overflow="visible">
      {inkOrder(st.strokes).map((s, i) => <path key={i} d={pathFor(s)} fill={s.color} opacity={s.opacity ?? 1} />)}
    </svg>
  );
}

// Stickers stuck on a cover or spine. Positions and sizes are % of the surface, so they scale with it.
export function Decor({ items = [], sel, onDown }) {
  return items.map((d) => (
    <span key={d.id} className={'decor' + (sel === d.id ? ' on' : '') + (onDown ? ' edit' : '')}
      style={{ left: d.x + '%', top: d.y + '%', width: d.s + '%', aspectRatio: String(1 / (d.a || 1)), transform: `translate(-50%,-50%) rotate(${d.r || 0}deg)` }}
      onPointerDown={onDown ? (e) => onDown(e, d) : undefined}>
      <Art st={d.st} />
    </span>
  ));
}

// Drag helper: reports movement as % of the surface the dragged thing sits on.
export function dragPct(e, surface, onMove) {
  e.preventDefault(); e.stopPropagation();
  const r = surface.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
  const mv = (ev) => onMove(((ev.clientX - sx) / r.width) * 100, ((ev.clientY - sy) / r.height) * 100);
  const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}

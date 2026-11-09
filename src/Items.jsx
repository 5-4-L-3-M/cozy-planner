import { BUILTIN } from './stickerArt';
import { stickerUrl } from './stickerPacks';
import { pathFor, inkOrder } from './geom';
import { WidgetView } from './Widgets';

export const SHAPES = {
  rect: 'M4 4H96V96H4Z',
  rounded: 'M18 4H82Q96 4 96 18V82Q96 96 82 96H18Q4 96 4 82V18Q4 4 18 4Z',
  circle: 'M50 4A46 46 0 1 1 49.99 4Z',
  triangle: 'M50 5L96 93H4Z',
  diamond: 'M50 3L97 50L50 97L3 50Z',
  hexagon: 'M27 5H73L97 50L73 95H27L3 50Z',
  star: 'M50 4L61 37L96 37L68 58L78 92L50 71L22 92L32 58L4 37L39 37Z',
  heart: 'M50 92C14 68 2 48 6 28C10 10 34 6 50 26C66 6 90 10 94 28C98 48 86 68 50 92Z',
  arrow: 'M4 36H60V12L96 50L60 88V64H4Z',
  speech: 'M8 8H92V70H42L22 92V70H8Z',
  banner: 'M3 22H97L86 50L97 78H3L14 50Z',
  cloud: 'M22 80C6 80 4 56 22 54C22 30 52 28 58 46C68 36 90 44 86 60C98 62 98 80 84 80Z',
};

export const WASHI = ['stripes', 'dots', 'grid', 'solid', 'checks', 'zigzag', 'hearts'];
export const WASHI_COLORS = [['#e8a9b6', '#f5d7dd'], ['#a7c4f2', '#dbe7fa'], ['#98a487', '#dfe6d4'], ['#f3d98a', '#fbf0cf'], ['#c4b2d6', '#ece4f0'], ['#cf826d', '#f2d6cc'], ['#6e819c', '#d6dce6']];
export const STICKY_COLORS = ['#f3d98a', '#f5b8c4', '#b9d8f0', '#c8e0b4', '#d9c8ec', '#f7c99b', '#fffaf1'];

export function WashiPattern({ id, kind, c1, c2 }) {
  const s = 22;
  const body = {
    stripes: <><rect width={s} height={s} fill={c2} /><path d={`M0 ${s}L${s} 0M-4 4L4 -4M${s - 4} ${s + 4}L${s + 4} ${s - 4}`} stroke={c1} strokeWidth="7" /></>,
    dots: <><rect width={s} height={s} fill={c2} /><circle cx={s / 2} cy={s / 2} r="4.5" fill={c1} /></>,
    grid: <><rect width={s} height={s} fill={c2} /><path d={`M0 0H${s}M0 0V${s}`} stroke={c1} strokeWidth="3" /></>,
    solid: <rect width={s} height={s} fill={c1} />,
    checks: <><rect width={s} height={s} fill={c2} /><rect width={s / 2} height={s / 2} fill={c1} /><rect x={s / 2} y={s / 2} width={s / 2} height={s / 2} fill={c1} /></>,
    zigzag: <><rect width={s} height={s} fill={c2} /><path d={`M0 ${s * 0.65}L${s / 2} ${s * 0.35}L${s} ${s * 0.65}`} stroke={c1} strokeWidth="4" fill="none" /></>,
    hearts: <><rect width={s} height={s} fill={c2} /><path d="M11 17C5 13 4 10 5 8C6 5 9 5 11 8C13 5 16 5 17 8C18 10 17 13 11 17Z" fill={c1} /></>,
  }[kind] || <rect width={s} height={s} fill={c1} />;
  return <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse">{body}</pattern>;
}

// Tape with torn (zig-zag) ends.
function tapePath(w, h) {
  const t = Math.min(8, h / 5), n = 5, step = h / n;
  let d = `M${t} 0H${w - t}`;
  for (let i = 1; i <= n; i++) d += `L${w - (i % 2 ? 0 : t)} ${step * i}`;
  d += `H${t}`;
  for (let i = n - 1; i >= 0; i--) d += `L${i % 2 ? 0 : t} ${step * i}`;
  return d + 'Z';
}

export function ItemView({ it }) {
  const { x, y, w, h, rot = 0, data = {} } = it;
  let body = null;
  if (it.kind === 'sticker') {
    if (data.src === 'pack') {
      body = <image href={stickerUrl(data.key)} width={w} height={h} preserveAspectRatio="none" />;
    } else if (data.src === 'builtin') {
      body = <svg width={w} height={h} viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible" dangerouslySetInnerHTML={{ __html: BUILTIN[data.key] || '' }} />;
    } else if (data.src === 'image') {
      body = <image href={data.url} width={w} height={h} preserveAspectRatio="none" />;
    } else if (data.src === 'strokes') {
      const sx = w / (data.w0 || 1), sy = h / (data.h0 || 1);
      body = (
        <g transform={`scale(${sx} ${sy})`}>
          {inkOrder(data.strokes).map((s, i) => <path key={i} d={pathFor(s)} fill={s.color} opacity={s.opacity ?? 1} />)}
        </g>
      );
    }
  } else if (it.kind === 'washi') {
    const pid = 'w-' + it.id;
    body = (
      <>
        <defs><WashiPattern id={pid} kind={data.pattern} c1={data.c1} c2={data.c2} /></defs>
        <path d={tapePath(w, h)} fill={`url(#${pid})`} opacity="0.88" />
      </>
    );
  } else if (it.kind === 'sticky') {
    const fs = Math.max(14, Math.min(w, h) * 0.11);
    body = (
      <>
        <rect x="4" y="6" width={w} height={h} rx="3" fill="rgba(0,0,0,0.12)" />
        <rect width={w} height={h} rx="3" fill={data.color || '#f3d98a'} />
        <rect width={w} height={h * 0.12} fill="rgba(0,0,0,0.05)" />
        <foreignObject x="0" y={h * 0.12} width={w} height={h * 0.88}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontFamily: "'Patrick Hand', cursive", fontSize: fs, lineHeight: 1.2, color: '#3d3121', padding: fs * 0.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
            {data.text || ''}
          </div>
        </foreignObject>
      </>
    );
  } else if (it.kind === 'text') {
    const fs = data.size || 28;
    body = (
      <foreignObject width={w} height={h}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontFamily: data.font === 'clean' ? "'Nunito', system-ui, sans-serif" : "'Patrick Hand', cursive", fontSize: fs, lineHeight: 1.3, color: data.color || '#3d3121', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontWeight: data.bold ? 700 : 400, textAlign: data.align || 'left' }}>
          {data.text || ''}
        </div>
      </foreignObject>
    );
  } else if (it.kind === 'widget') {
    body = <WidgetView data={data} w={w} h={h} />;
  } else if (it.kind === 'shape') {
    body = (
      <svg width={w} height={h} viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible">
        <path d={SHAPES[data.shape] || SHAPES.rect} fill={data.fill || 'none'} stroke={data.stroke || '#3d3121'}
          strokeWidth={data.sw ?? 4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
    );
  }
  return <g transform={`translate(${x} ${y}) rotate(${rot} ${w / 2} ${h / 2})`}>{body}</g>;
}

// Corners of an item in page coordinates (accounts for rotation).
export function itemCorners(it) {
  const cx = it.x + it.w / 2, cy = it.y + it.h / 2, r = ((it.rot || 0) * Math.PI) / 180;
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => {
    const dx = (sx * it.w) / 2, dy = (sy * it.h) / 2;
    return [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)];
  });
}
export function itemHit(it, p) {
  const cx = it.x + it.w / 2, cy = it.y + it.h / 2, r = (-(it.rot || 0) * Math.PI) / 180;
  const dx = p[0] - cx, dy = p[1] - cy;
  const lx = dx * Math.cos(r) - dy * Math.sin(r), ly = dx * Math.sin(r) + dy * Math.cos(r);
  return Math.abs(lx) <= it.w / 2 + 6 && Math.abs(ly) <= it.h / 2 + 6;
}

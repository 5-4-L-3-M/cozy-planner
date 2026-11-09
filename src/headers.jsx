import { createContext, useContext, useEffect, useState } from 'react';
import { sb } from './supabase';
import { pathFor, inkOrder } from './geom';
import { ItemView } from './Items';

// Your own hand-drawn headers: a drawing/sticker you pick to stand in for a month name, a year, or a weekday.
// Keys: m-YYYY-M (month, 0-based), y-YYYY (year), wd-0..6 (Mon..Sun).
export const HeaderCtx = createContext({});
export const useHeaders = () => useContext(HeaderCtx);
export const monthKey = (y, m) => `m-${y}-${m}`;

export function useHeaderArt(nbId) {
  const [map, setMap] = useState({});
  useEffect(() => {
    if (!nbId) return;
    let live = true;
    const load = () => sb.from('header_art').select('key,art').eq('notebook_id', nbId).then(({ data }) => {
      if (live) setMap(Object.fromEntries((data || []).map((r) => [r.key, r.art])));
    });
    load();
    const ch = sb.channel('headers-' + nbId).on('postgres_changes', { event: '*', schema: 'public', table: 'header_art' }, load).subscribe();
    return () => { live = false; sb.removeChannel(ch); };
  }, [nbId]);
  const api = {
    async save(key, art) {
      setMap((m) => ({ ...m, [key]: art }));
      await sb.from('header_art').upsert({ notebook_id: nbId, key, art }, { onConflict: 'notebook_id,key' });
    },
    async remove(key) {
      setMap((m) => { const n = { ...m }; delete n[key]; return n; });
      await sb.from('header_art').delete().eq('notebook_id', nbId).eq('key', key);
    },
  };
  return [map, api];
}

// Draws saved art inside an SVG, fitted into the box (x, y, w, h). align: 'start' | 'middle' | 'end'.
export function ArtFit({ art, x, y, w, h, align = 'start' }) {
  if (!art) return null;
  const k = Math.min(w / (art.w0 || 1), h / (art.h0 || 1));
  const dw = (art.w0 || 1) * k, dh = (art.h0 || 1) * k;
  const ox = align === 'middle' ? x + (w - dw) / 2 : align === 'end' ? x + w - dw : x;
  const oy = y + (h - dh) / 2;
  return (
    <g transform={`translate(${ox} ${oy}) scale(${k})`} pointerEvents="none">
      {(art.items || []).map((it) => <ItemView key={it.id} it={it} />)}
      {inkOrder(art.strokes).map((s, i) => <path key={i} d={pathFor(s)} fill={s.color} opacity={s.opacity ?? 1} />)}
    </g>
  );
}

// Same art as a little inline picture (for HTML places like the week page header).
export function ArtInline({ art, height = 34, className }) {
  if (!art) return null;
  const w = Math.max(1, (art.w0 / art.h0) * height);
  return (
    <svg className={className} width={w} height={height} viewBox={`0 0 ${art.w0} ${art.h0}`} style={{ overflow: 'visible', verticalAlign: 'middle' }} aria-hidden="true">
      {(art.items || []).map((it) => <ItemView key={it.id} it={it} />)}
      {inkOrder(art.strokes).map((s, i) => <path key={i} d={pathFor(s)} fill={s.color} opacity={s.opacity ?? 1} />)}
    </svg>
  );
}

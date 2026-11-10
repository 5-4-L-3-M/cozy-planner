import { useCallback, useEffect, useState } from 'react';
import { sb } from './supabase';

const logErr = (r) => r?.error && console.error(r.error);
const ITEM_KEYS = ['id', 'page_id', 'kind', 'x', 'y', 'w', 'h', 'rot', 'z', 'data'];
const cleanItem = (o) => Object.fromEntries(ITEM_KEYS.map((k) => [k, o[k]]));

/* Items placed on a page: stickers, washi, sticky notes, shapes. */
export function useItems(pageId) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    setItems([]);
    if (!pageId) return;
    let live = true;
    sb.from('items').select('*').eq('page_id', pageId).order('z').then(({ data }) => live && setItems(data || []));
    const ch = sb.channel('items-' + pageId + '-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `page_id=eq.${pageId}` }, (p) => {
        if (p.eventType === 'DELETE') return setItems((s) => s.filter((x) => x.id !== p.old.id));
        setItems((s) => [...s.filter((x) => x.id !== p.new.id), p.new]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'items' }, (p) => setItems((s) => s.filter((x) => x.id !== p.old.id)))
      .subscribe();
    return () => { live = false; sb.removeChannel(ch); };
  }, [pageId]);

  const put = useCallback((list) => {
    if (!list.length) return;
    const ids = new Set(list.map((x) => x.id));
    setItems((s) => [...s.filter((x) => !ids.has(x.id)), ...list]);
    sb.from('items').upsert(list.map(cleanItem)).then(logErr);
  }, []);
  const removeItems = useCallback((ids) => {
    if (!ids.length) return;
    setItems((s) => s.filter((x) => !ids.includes(x.id)));
    sb.from('items').delete().in('id', ids).then(logErr);
  }, []);
  return { items, put, removeItems };
}

/* The sticker library (your own stickers). */
export function useStickers(user) {
  const [stickers, setStickers] = useState([]);
  useEffect(() => {
    sb.from('stickers').select('*').order('position').then(({ data }) => setStickers(data || []));
    const ch = sb.channel('stickers-' + user.id + '-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stickers' }, (p) => {
        if (p.eventType === 'DELETE') return setStickers((s) => s.filter((x) => x.id !== p.old.id));
        setStickers((s) => [...s.filter((x) => x.id !== p.new.id), p.new].sort((a, b) => a.position - b.position));
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [user.id]);

  const api = {
    add(row) {
      const st = { id: crypto.randomUUID(), position: Date.now(), ...row };
      setStickers((s) => [...s, st]);
      sb.from('stickers').insert(st).then(logErr);
    },
    update(id, patch) {
      setStickers((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)).sort((a, b) => a.position - b.position));
      sb.from('stickers').update(patch).eq('id', id).then(logErr);
    },
    remove(id) {
      setStickers((s) => s.filter((x) => x.id !== id));
      sb.from('stickers').delete().eq('id', id).then(logErr);
    },
  };
  return [stickers, api];
}

/* Shrink an image file and upload it; returns its public link and size. */
export async function uploadImage(user, file) {
  const img = await new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file);
  });
  const k = Math.min(1, 700 / Math.max(img.width, img.height));
  const w = Math.round(img.width * k), h = Math.round(img.height * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  const blob = await new Promise((res) => c.toBlob(res, 'image/webp', 0.9));
  const path = `${user.id}/${crypto.randomUUID()}.webp`;
  const up = await sb.storage.from('stickers').upload(path, blob, { contentType: 'image/webp' });
  if (up.error) throw up.error;
  return { url: sb.storage.from('stickers').getPublicUrl(path).data.publicUrl, w, h };
}

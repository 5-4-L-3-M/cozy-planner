import { createContext, useState } from 'react';

export const RemCtx = createContext({ settings: {}, update: () => {} });
import { sb, SB_URL } from './supabase';
import { parse } from './dates';

const FN = `${SB_URL}/functions/v1/push`;
const TD = 'https://api.todoist.com/api/v1';

/* ---------- phone/PC notifications ---------- */
const b64ToBytes = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
export async function pushStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) ? 'on' : 'off';
}
export async function enablePush() {
  if ((await Notification.requestPermission()) !== 'granted') return 'blocked';
  const reg = await navigator.serviceWorker.ready;
  const { publicKey } = await fetch(FN).then((r) => r.json());
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) }));
  const j = sub.toJSON();
  await sb.from('push_subs').upsert({ endpoint: j.endpoint, sub: j }, { onConflict: 'endpoint' });
  return 'on';
}
export async function disablePush() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) { await sb.from('push_subs').delete().eq('endpoint', sub.endpoint); await sub.unsubscribe(); }
  return 'off';
}

// When a to-do with a time should ping: on its day at that time, on this device's clock.
export function remindAt(day, time, before = 0) {
  if (!day || !time) return null;
  const [h, m] = time.split(':').map(Number);
  const d = parse(day); d.setHours(h, m - before, 0, 0);
  return d.toISOString();
}
export const timeLabel = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'a' : 'p'}`; };

/* ---------- Todoist ---------- */
const tdFetch = (token, path, opts = {}) => fetch(TD + path, { ...opts, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
const clean = (text) => text.replace(/#[\w-]+/g, '').replace(/\s+/g, ' ').trim();
export async function todoistTest(token) { const r = await tdFetch(token, '/projects?limit=1'); return r.ok; }
export async function todoistSend(token, t) {
  const due = t.time ? { due_datetime: new Date(remindAt(t.day, t.time)).toISOString() } : { due_date: t.day };
  const body = JSON.stringify({ content: clean(t.text) || t.text, ...due, labels: (t.text.match(/#[\w-]+/g) || []).map((x) => x.slice(1)) });
  const r = t.todoist_id ? await tdFetch(token, '/tasks/' + t.todoist_id, { method: 'POST', body }) : await tdFetch(token, '/tasks', { method: 'POST', body });
  if (!r.ok) throw new Error('Todoist said no (' + r.status + ')');
  return t.todoist_id || (await r.json()).id;
}
export const todoistDone = (token, id, done) => tdFetch(token, `/tasks/${id}/${done ? 'close' : 'reopen'}`, { method: 'POST' }).catch(() => {});
export const todoistDelete = (token, id) => tdFetch(token, '/tasks/' + id, { method: 'DELETE' }).catch(() => {});
// Anything checked off over in Todoist gets checked off here too.
export async function todoistSyncDone(token, tasks, updateTask) {
  for (const t of tasks.filter((x) => x.todoist_id && !x.done).slice(0, 40)) {
    try {
      const r = await tdFetch(token, '/tasks/' + t.todoist_id);
      if (r.status === 404) { updateTask(t.id, { done: true }); continue; }
      if (r.ok) { const j = await r.json(); if (j.checked || j.is_completed || j.completed_at) updateTask(t.id, { done: true }); }
    } catch { /* offline: try later */ }
  }
}

/* ---------- settings sheet (left menu → Reminders) ---------- */
export function ReminderSettings({ settings, update, onClose }) {
  const [st, setSt] = useState('…');
  const [busy, setBusy] = useState(false);
  const [tok, setTok] = useState(settings.todoist?.token || '');
  const [msg, setMsg] = useState('');
  useState(() => { pushStatus().then(setSt).catch(() => setSt('unsupported')); });
  const label = { on: 'On for this device', off: 'Off on this device', blocked: 'Blocked — allow notifications for this site in your browser settings', unsupported: 'This browser can’t do notifications', '…': '…' }[st];
  return (
    <>
      <div className="sheet-bg" onClick={onClose} />
      <section className="sheet" aria-label="Reminders">
        <div className="grab" />
        <div className="ptitle hand">Reminders</div>
        <div className="isec">
          <div className="lbl">NOTIFICATIONS</div>
          <p className="hint">Give a to-do a time (tap it → the clock) and this device pings you then. Turn this on on each device you want pings on.</p>
          <div className="prow"><span className="hint" style={{ flex: 1 }}>{label}</span>
            {st === 'on' ? <button className="mini" disabled={busy} onClick={async () => { setBusy(true); setSt(await disablePush()); setBusy(false); }}>Turn off</button>
              : st === 'off' ? <button className="btn primary" disabled={busy} onClick={async () => { setBusy(true); try { setSt(await enablePush()); } catch { setMsg('Couldn’t turn on notifications.'); } setBusy(false); }}>Turn on</button> : null}
          </div>
          <label className="toggle" style={{ marginTop: 8 }}>
            <span>Ping me</span>
            <select value={settings.remindBefore || 0} onChange={(e) => update({ remindBefore: +e.target.value })}>
              <option value={0}>at the time</option><option value={5}>5 min before</option><option value={10}>10 min before</option><option value={15}>15 min before</option><option value={30}>30 min before</option><option value={60}>1 hour before</option>
            </select>
          </label>
        </div>
        <div className="isec" style={{ marginTop: 14 }}>
          <div className="lbl">TODOIST</div>
          <p className="hint">Paste your Todoist API token (Todoist → Settings → Integrations → Developer). Then use “Send to Todoist” on any to-do; checking it off in either app checks it off in both.</p>
          <input className="tdtok" type="password" value={tok} placeholder="Todoist API token" onChange={(e) => setTok(e.target.value.trim())} autoComplete="off" />
          <div className="prow" style={{ marginTop: 8 }}>
            {settings.todoist?.token && <button className="mini danger" onClick={() => { update({ todoist: null }); setTok(''); setMsg('Disconnected.'); }}>Disconnect</button>}
            <button className="btn primary" style={{ marginLeft: 'auto' }} disabled={!tok || busy} onClick={async () => {
              setBusy(true); setMsg('');
              const ok = await todoistTest(tok).catch(() => false);
              if (ok) { update({ todoist: { ...(settings.todoist || {}), token: tok } }); setMsg('Connected ♡'); } else setMsg('That token didn’t work — double-check it.');
              setBusy(false);
            }}>{settings.todoist?.token ? 'Save' : 'Connect'}</button>
          </div>
          <label className="toggle" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={!!settings.todoist?.auto} disabled={!settings.todoist?.token} onChange={(e) => update({ todoist: { ...settings.todoist, auto: e.target.checked } })} />
            <span>Send every to-do with a time to Todoist automatically</span>
          </label>
          {msg && <p className="hint" style={{ marginTop: 6 }}>{msg}</p>}
        </div>
        <button className="btn primary" style={{ width: '100%', marginTop: 14 }} onClick={onClose}>Done</button>
      </section>
    </>
  );
}

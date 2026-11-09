// Cozy Planner reminders (optional).
// GET  → hands out the public push key so browsers can subscribe.
// POST → called every minute by the scheduler (with its secret) to send due to-do reminders.
// Deploy: supabase functions deploy push --no-verify-jwt
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const CONTACT = Deno.env.get('PUSH_CONTACT') || 'mailto:planner@example.com';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Content-Type': 'application/json' };
const b64u = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function getSecret(name: string) {
  const { data } = await sb.from('app_secrets').select('value').eq('name', name).maybeSingle();
  return data?.value as string | undefined;
}
// Keys are made here, once, and never leave the server (except the public half).
async function ensureKeys() {
  let pub = await getSecret('vapid_public'), priv = await getSecret('vapid_private');
  if (!pub || !priv) {
    const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    pub = b64u(await crypto.subtle.exportKey('raw', kp.publicKey));
    priv = (await crypto.subtle.exportKey('jwk', kp.privateKey)).d!;
    await sb.from('app_secrets').upsert([{ name: 'vapid_public', value: pub }, { name: 'vapid_private', value: priv }]);
  }
  if (!(await getSecret('cron_secret'))) {
    const r = new Uint8Array(24); crypto.getRandomValues(r);
    await sb.from('app_secrets').upsert({ name: 'cron_secret', value: b64u(r.buffer) });
  }
  return { pub: pub!, priv: priv! };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const { pub, priv } = await ensureKeys();
  if (req.method === 'GET') return new Response(JSON.stringify({ publicKey: pub }), { headers: cors });

  // Only the scheduler may send.
  if (!req.headers.get('x-cron') || req.headers.get('x-cron') !== (await getSecret('cron_secret'))) return new Response('no', { status: 401, headers: cors });
  webpush.setVapidDetails(CONTACT, pub, priv);
  const now = new Date();
  const since = new Date(now.getTime() - 6 * 3600e3).toISOString();
  const { data: due } = await sb.from('tasks').select('id,user_id,text,time,day').lte('remind_at', now.toISOString()).gte('remind_at', since).is('notified_at', null).eq('done', false).limit(200);
  let sent = 0;
  for (const t of due || []) {
    await sb.from('tasks').update({ notified_at: now.toISOString() }).eq('id', t.id);
    const { data: subs } = await sb.from('push_subs').select('id,sub').eq('user_id', t.user_id);
    const body = JSON.stringify({ title: t.text.replace(/#[\w-]+/g, '').trim() || 'To-do', body: t.time ? 'Due at ' + t.time : 'Reminder', tag: t.id });
    for (const s of subs || []) {
      try { await webpush.sendNotification(s.sub, body, { TTL: 3600 }); sent++; }
      catch (e) { const c = (e as { statusCode?: number }).statusCode; if (c === 404 || c === 410) await sb.from('push_subs').delete().eq('id', s.id); }
    }
  }
  return new Response(JSON.stringify({ due: due?.length || 0, sent }), { headers: cors });
});

-- OPTIONAL: to-do reminder notifications.
-- 1) Deploy the edge function first:  supabase functions deploy push --no-verify-jwt
-- 2) Open the function URL once in a browser (https://YOUR-PROJECT.supabase.co/functions/v1/push) so it creates its keys.
-- 3) Enable the pg_cron and pg_net extensions (Dashboard → Database → Extensions), replace YOUR-PROJECT below, then run this.
--    It asks the function every minute to send any reminders that are due.
select cron.schedule(
  'planner-reminders',
  '* * * * *',
  $$ select net.http_post(
       url := 'https://YOUR-PROJECT.supabase.co/functions/v1/push',
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select value from public.app_secrets where name = 'cron_secret')),
       body := '{}'::jsonb) $$
);

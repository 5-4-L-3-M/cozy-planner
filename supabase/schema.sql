-- Cozy Planner: database setup.
-- Run this once in your Supabase project (Dashboard → SQL Editor → New query → paste → Run).
-- Every table is private per user: row-level security only lets people see their own rows.

create extension if not exists pgcrypto;

-- ---------- notebooks & pages ----------
create table if not exists public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'planner' check (kind in ('planner', 'notebook')),
  color text not null default '#4f8380',
  charm text,
  label text,
  plate text,
  decor jsonb not null default '{}'::jsonb,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notebook_id uuid references public.notebooks(id) on delete cascade,
  week_start date,
  kind text not null default 'extra' check (kind in ('notes', 'extra', 'month', 'decor')),
  section text not null default 'week',
  name text not null default 'Page',
  position double precision not null default 0,
  progress jsonb not null default '{"x": 0.5, "y": 0.5, "hidden": true}'::jsonb,
  color text,
  pinned boolean not null default false,
  paper jsonb,
  content jsonb,
  ref_type text,
  ref_group text,
  created_at timestamptz not null default now()
);
create index if not exists pages_user_week on public.pages (user_id, week_start);
create index if not exists pages_user_pinned on public.pages (user_id) where pinned;
create index if not exists pages_nb on public.pages (notebook_id);
create unique index if not exists pages_one_notes_per_week_nb on public.pages (notebook_id, week_start) where kind = 'notes';
create unique index if not exists pages_one_month on public.pages (notebook_id, week_start) where kind = 'month';
create unique index if not exists pages_one_month_cover on public.pages (notebook_id, week_start) where section = 'monthcover';

-- ---------- drawing ----------
create table if not exists public.strokes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  tool text not null check (tool in ('pen', 'highlighter', 'mask')),
  color text not null,
  size real not null,
  opacity real not null default 1,
  thinning real,
  style text,
  stab real,
  points jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists strokes_page on public.strokes (page_id);

create table if not exists public.items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  kind text not null check (kind in ('sticker', 'washi', 'sticky', 'shape', 'widget', 'text')),
  x real not null, y real not null, w real not null, h real not null,
  rot real not null default 0,
  z double precision not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists items_page on public.items (page_id);

create table if not exists public.header_art (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notebook_id uuid not null references public.notebooks(id) on delete cascade,
  key text not null,
  art jsonb not null,
  created_at timestamptz default now(),
  unique (notebook_id, key)
);

-- ---------- to-dos ----------
create table if not exists public.recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notebook_id uuid references public.notebooks(id) on delete cascade,
  text text not null,
  rule jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notebook_id uuid references public.notebooks(id) on delete cascade,
  day date not null,
  text text not null,
  done boolean not null default false,
  position double precision not null default 0,
  priority smallint not null default 0,
  parent_id uuid references public.tasks(id) on delete cascade,
  recur_id uuid references public.recurring(id) on delete set null,
  time text,
  remind_at timestamptz,
  notified_at timestamptz,
  todoist_id text,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_day on public.tasks (user_id, day);
create index if not exists tasks_nb_day on public.tasks (notebook_id, day);
create unique index if not exists tasks_one_per_recur_day on public.tasks (recur_id, day) where recur_id is not null;
create index if not exists tasks_remind_due on public.tasks (remind_at) where remind_at is not null and notified_at is null;

-- ---------- stickers & settings ----------
create table if not exists public.stickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null default 'My stickers',
  position double precision not null default 0,
  kind text not null check (kind in ('strokes', 'image')),
  w real not null, h real not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists stickers_user on public.stickers (user_id);

create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- reminders (optional) ----------
create table if not exists public.push_subs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  sub jsonb not null,
  created_at timestamptz default now()
);
-- Server-only keys for push notifications. RLS on with no policies = nobody but the server can read it.
create table if not exists public.app_secrets (
  name text primary key,
  value text not null
);

-- ---------- row-level security: everyone only sees their own stuff ----------
do $$
declare t text;
begin
  foreach t in array array['notebooks', 'pages', 'strokes', 'items', 'header_art', 'recurring', 'tasks', 'stickers', 'settings', 'push_subs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;
alter table public.app_secrets enable row level security;

-- ---------- live sync between your devices ----------
do $$
declare t text;
begin
  foreach t in array array['notebooks', 'pages', 'strokes', 'items', 'header_art', 'recurring', 'tasks', 'stickers', 'settings'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- sticker image storage ----------
-- Public bucket so sticker images load fast; uploads/deletes only into your own folder.
insert into storage.buckets (id, name, public) values ('stickers', 'stickers', true) on conflict (id) do nothing;
drop policy if exists sticker_upload_own on storage.objects;
create policy sticker_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'stickers' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists sticker_delete_own on storage.objects;
create policy sticker_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'stickers' and (storage.foldername(name))[1] = (select auth.uid())::text);

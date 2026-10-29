-- Hutao Bot account, session and EXP schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.hutao_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  role text not null default 'USER FREE' check (role in ('OWNER','PREMIUM','USER FREE')),
  exp bigint not null default 0 check (exp >= 0),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create table if not exists public.hutao_sessions (
  token_hash text primary key,
  user_id uuid not null references public.hutao_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists hutao_sessions_user_id_idx on public.hutao_sessions(user_id);
create table if not exists public.hutao_game_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.hutao_users(id) on delete cascade,
  event text not null,
  exp_delta integer not null,
  created_at timestamptz not null default now()
);
-- Server uses Supabase service-role key only. Never expose it in frontend code.


-- Shared community room. API accesses this table with the server-only service-role key.
create table if not exists public.hutao_community_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.hutao_users(id) on delete cascade,
  username text not null,
  role text not null default 'USER FREE',
  text text not null default '',
  image text,
  room text not null default 'general' check (room in ('general','bot-talk','media')),
  created_at timestamptz not null default now(),
  constraint hutao_community_text_length check (char_length(text) <= 2000)
);
create index if not exists hutao_community_created_idx on public.hutao_community_messages(created_at desc);

-- Safe migration when upgrading an existing V6 database.
alter table public.hutao_community_messages add column if not exists room text not null default 'general';
create index if not exists hutao_community_room_created_idx on public.hutao_community_messages(room, created_at desc);

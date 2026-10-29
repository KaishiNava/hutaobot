-- HUTAO COMMUNITY ONLY
-- Jalankan setelah tabel public.hutao_users tersedia di Supabase SQL Editor.
create table if not exists public.hutao_community_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.hutao_users(id) on delete cascade,
  username text not null,
  role text not null default 'USER FREE',
  text text not null default '',
  image text,
  room text not null default 'general'
    check (room in ('general','bot-talk','media')),
  created_at timestamptz not null default now(),
  constraint hutao_community_text_length check (char_length(text) <= 2000)
);
create index if not exists hutao_community_created_idx
  on public.hutao_community_messages(created_at desc);
create index if not exists hutao_community_room_created_idx
  on public.hutao_community_messages(room, created_at desc);

-- Refresh Supabase/PostgREST schema cache.
notify pgrst, 'reload schema';

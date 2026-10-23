-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

create table if not exists public.docs (
  collection text not null,
  id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists docs_collection_created on public.docs (collection, created_at desc);

-- Only the server (service role key) touches this table.
alter table public.docs enable row level security;

-- Private bucket for photos, voice notes and videos.
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 104857600)
on conflict (id) do nothing;

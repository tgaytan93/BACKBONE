-- Backbone Phase 3 schema
-- Run this in the Supabase SQL Editor (project dashboard, SQL Editor, New query)

-- 1. Add Gmail tracking columns to messages table
alter table public.messages add column if not exists gmail_message_id text;
alter table public.messages add column if not exists gmail_thread_id text;

-- Unique constraint for idempotent inbound inserts (dedup key)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'messages_gmail_message_id_key'
  ) then
    alter table public.messages
      add constraint messages_gmail_message_id_key unique (gmail_message_id);
  end if;
end $$;

-- 2. Create gmail_sync_state table
create table if not exists public.gmail_sync_state (
  id uuid primary key default gen_random_uuid(),
  last_history_id text,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.gmail_sync_state enable row level security;

-- Service role only. No other policies. Server-side code is the only caller.
drop policy if exists "Service role can read sync state" on public.gmail_sync_state;
create policy "Service role can read sync state"
  on public.gmail_sync_state
  for select
  to service_role
  using (true);

drop policy if exists "Service role can insert sync state" on public.gmail_sync_state;
create policy "Service role can insert sync state"
  on public.gmail_sync_state
  for insert
  to service_role
  with check (true);

drop policy if exists "Service role can update sync state" on public.gmail_sync_state;
create policy "Service role can update sync state"
  on public.gmail_sync_state
  for update
  to service_role
  using (true)
  with check (true);

-- 3. Seed one initial row if none exists
insert into public.gmail_sync_state (last_history_id)
select null
where not exists (select 1 from public.gmail_sync_state);

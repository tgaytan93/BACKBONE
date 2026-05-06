-- Backbone Phase 2 schema
-- Run this in the Supabase SQL Editor (project dashboard, SQL Editor, New query)

-- 1. Add email column to existing submissions table
alter table public.submissions add column if not exists email text;

-- 2. Create messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  subject text,
  body text not null,
  from_address text not null,
  to_address text not null,
  sent_at timestamptz not null default now(),
  resend_id text,
  is_auto_reply boolean not null default false
);

alter table public.messages enable row level security;

-- 3. RLS policies
drop policy if exists "Authenticated users can view messages" on public.messages;
create policy "Authenticated users can view messages"
  on public.messages
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can insert messages" on public.messages;
create policy "Authenticated users can insert messages"
  on public.messages
  for insert
  to authenticated
  with check (true);

drop policy if exists "Service role can insert messages" on public.messages;
create policy "Service role can insert messages"
  on public.messages
  for insert
  to service_role
  with check (true);

-- No update or delete policies. Messages are immutable history.

-- 4. Indexes
create index if not exists messages_submission_id_idx
  on public.messages (submission_id);

create index if not exists messages_sent_at_desc_idx
  on public.messages (sent_at desc);

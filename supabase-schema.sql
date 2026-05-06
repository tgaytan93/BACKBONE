-- Backbone Phase 1 schema
-- Run this in the Supabase SQL Editor (project dashboard → SQL Editor → New query)

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  business text,
  whats_broken text,
  tier text,
  budget text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  notes text
);

alter table public.submissions enable row level security;

drop policy if exists "Anyone can insert submissions" on public.submissions;
create policy "Anyone can insert submissions"
  on public.submissions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated users can view submissions" on public.submissions;
create policy "Authenticated users can view submissions"
  on public.submissions
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can update submissions" on public.submissions;
create policy "Authenticated users can update submissions"
  on public.submissions
  for update
  to authenticated
  using (true)
  with check (true);

create index if not exists submissions_created_at_desc_idx
  on public.submissions (created_at desc);

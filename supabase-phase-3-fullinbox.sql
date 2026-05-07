-- Backbone Phase 3 full-inbox mode
-- Run in Supabase SQL Editor. Idempotent.

-- 1. Allow inbound messages to land without a parent submission.
alter table public.messages alter column submission_id drop not null;

-- 2. Triage status. Default 'attached' is correct for all existing rows
--    (under strict mode every row in messages was matched to a submission).
alter table public.messages add column if not exists status text;
update public.messages set status = 'attached' where status is null;
alter table public.messages alter column status set not null;
alter table public.messages alter column status set default 'attached';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'messages_status_check'
  ) then
    alter table public.messages
      add constraint messages_status_check
      check (status in ('attached', 'unmatched', 'archived', 'spam'));
  end if;
end $$;

-- 3. Sender display name (e.g. "Jane Operator" from "Jane Operator <jane@x.com>").
alter table public.messages add column if not exists from_name text;

-- 4. Filtering index for triage queries.
create index if not exists messages_status_idx on public.messages (status);

-- 5. Authenticated UPDATE policy so triage actions (attach, dismiss, etc.) can write.
drop policy if exists "Authenticated users can update messages" on public.messages;
create policy "Authenticated users can update messages"
  on public.messages
  for update
  to authenticated
  using (true)
  with check (true);

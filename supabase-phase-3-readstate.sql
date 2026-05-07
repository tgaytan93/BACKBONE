-- Backbone Phase 3 read/unread state
-- Run in Supabase SQL Editor. Idempotent.

alter table public.messages add column if not exists read_at timestamptz;

-- Partial index: only unread rows participate, keeping the index tiny.
-- Every read-state query filters on read_at IS NULL so this is what we need.
create index if not exists messages_read_at_idx
  on public.messages (read_at)
  where read_at is null;

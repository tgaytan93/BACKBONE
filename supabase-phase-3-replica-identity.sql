-- Backbone Phase 3 realtime UPDATE event fix
-- Run in Supabase SQL Editor. Idempotent.
--
-- Why: postgres logical replication only includes the primary key in the OLD
-- row payload by default. Realtime subscribers see UPDATE events but cannot
-- inspect what the previous values were. Setting REPLICA IDENTITY FULL makes
-- the OLD row include every column, so subscribers can see status transitions
-- like unmatched -> attached. Slight perf cost on UPDATE; negligible at this
-- table's size.

alter table public.messages replica identity full;

-- Re-assert the publication membership (idempotent).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

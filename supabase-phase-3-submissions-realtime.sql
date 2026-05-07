-- Backbone Phase 3 submissions realtime
-- Run in Supabase SQL Editor. Idempotent.
--
-- Enables UPDATE and DELETE realtime events on the submissions table so the
-- admin dashboard kebab menu (status changes, delete) propagates to all open
-- /admin tabs. REPLICA IDENTITY FULL ensures the full OLD row is included in
-- DELETE and UPDATE events, which the dashboard handler reads to know which
-- row was affected and what its prior state was.

alter table public.submissions replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table public.submissions;
  end if;
end $$;

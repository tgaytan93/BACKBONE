-- Backbone Phase 3 realtime hookup
-- Run this in Supabase SQL Editor. Idempotent.

-- Add messages to the supabase_realtime publication so INSERT events stream.
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

-- Realtime respects RLS. The existing SELECT policy already covers authenticated.
-- Re-asserting it here so this migration is self-contained.
drop policy if exists "Authenticated users can view messages" on public.messages;
create policy "Authenticated users can view messages"
  on public.messages
  for select
  to authenticated
  using (true);

-- Backbone Phase 5 v1 view-as (impersonation)
-- Run in Supabase SQL Editor. Idempotent.
--
-- Backbone admins (role = 'backbone_admin') can impersonate a tenant org for
-- support purposes. Active sessions live in view_as_sessions; the unique
-- partial index ensures one active session per admin at a time. Locked
-- sessions persist across devices.

create table if not exists public.view_as_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  target_org_id uuid not null references public.orgs(id) on delete cascade,
  is_locked boolean not null default false,
  started_at timestamptz default now(),
  ended_at timestamptz
);

create unique index if not exists view_as_sessions_one_active_per_admin
  on public.view_as_sessions(admin_user_id) where (ended_at is null);

create index if not exists view_as_sessions_admin_user_id_idx
  on public.view_as_sessions(admin_user_id);

alter table public.view_as_sessions enable row level security;

drop policy if exists "view_as_sessions_select" on public.view_as_sessions;
create policy "view_as_sessions_select"
  on public.view_as_sessions
  for select
  to authenticated
  using (public.is_backbone_admin());

drop policy if exists "view_as_sessions_insert" on public.view_as_sessions;
create policy "view_as_sessions_insert"
  on public.view_as_sessions
  for insert
  to authenticated
  with check (
    public.is_backbone_admin()
    and admin_user_id = auth.uid()
  );

drop policy if exists "view_as_sessions_update" on public.view_as_sessions;
create policy "view_as_sessions_update"
  on public.view_as_sessions
  for update
  to authenticated
  using (
    public.is_backbone_admin()
    and admin_user_id = auth.uid()
  )
  with check (
    public.is_backbone_admin()
    and admin_user_id = auth.uid()
  );

-- No delete policy. Sessions are append-only; "end" sets ended_at.

-- Helper function: returns the current view-as target org for the given admin,
-- or null if none active.
create or replace function public.current_view_as_target(admin_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select target_org_id
    from public.view_as_sessions
   where admin_user_id = admin_id
     and ended_at is null
   limit 1
$$;

grant execute on function public.current_view_as_target(uuid) to authenticated;

-- Backbone Phase 5 v1 foundation
-- Multi-tenant database setup. Run in Supabase SQL Editor.
-- Idempotent where possible; some statements (DROP POLICY) are safe re-runs.
--
-- This migration:
--   1. Creates orgs, org_memberships, audit_log
--   2. Adds org_id to existing tenant tables (submissions, messages, gmail_sync_state)
--   3. Backfills all existing data to a "backbone-hq" tenant
--   4. Establishes Tyler as a backbone_admin
--   5. Rewrites RLS on tenant tables with helper-driven org isolation
--   6. Defines a Custom Access Token JWT hook to inject org_id and org_role
--   7. Defines an audit trigger function (NOT attached to any tables yet)
--
-- Order matters: new tables and backfill happen before old RLS is replaced,
-- so existing queries keep working through the migration.

-- =============================================================================
-- 1. NEW TABLES
-- =============================================================================

create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  business_name text not null,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists orgs_slug_idx on public.orgs(slug);
create index if not exists orgs_status_idx on public.orgs(status);

create table if not exists public.org_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.orgs(id) on delete cascade,
  role text not null default 'owner'
    check (role in ('owner', 'backbone_admin')),
  created_at timestamptz default now(),
  unique(user_id, org_id)
);

create index if not exists org_memberships_user_id_idx on public.org_memberships(user_id);
create index if not exists org_memberships_org_id_idx on public.org_memberships(org_id);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.orgs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  before jsonb,
  after jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists audit_log_org_id_created_at_idx
  on public.audit_log(org_id, created_at desc);
create index if not exists audit_log_user_id_idx on public.audit_log(user_id);
create index if not exists audit_log_action_idx on public.audit_log(action);

-- =============================================================================
-- 2. SEED BACKBONE-HQ ORG
-- =============================================================================

insert into public.orgs (slug, business_name, status)
values ('backbone-hq', 'Backbone HQ', 'active')
on conflict (slug) do nothing;

-- =============================================================================
-- 3. ADD org_id TO EXISTING TENANT TABLES
-- =============================================================================

alter table public.submissions      add column if not exists org_id uuid;
alter table public.messages         add column if not exists org_id uuid;
alter table public.gmail_sync_state add column if not exists org_id uuid;

-- =============================================================================
-- 4. BACKFILL EXISTING ROWS TO BACKBONE-HQ
-- =============================================================================

update public.submissions
   set org_id = (select id from public.orgs where slug = 'backbone-hq')
 where org_id is null;

update public.messages
   set org_id = (select id from public.orgs where slug = 'backbone-hq')
 where org_id is null;

update public.gmail_sync_state
   set org_id = (select id from public.orgs where slug = 'backbone-hq')
 where org_id is null;

-- =============================================================================
-- 5. ENFORCE NOT NULL + FOREIGN KEYS + INDEXES
-- =============================================================================

-- Add the FK constraints (not added in step 3 because column was nullable initially).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'submissions_org_id_fkey'
  ) then
    alter table public.submissions
      add constraint submissions_org_id_fkey
      foreign key (org_id) references public.orgs(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'messages_org_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_org_id_fkey
      foreign key (org_id) references public.orgs(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'gmail_sync_state_org_id_fkey'
  ) then
    alter table public.gmail_sync_state
      add constraint gmail_sync_state_org_id_fkey
      foreign key (org_id) references public.orgs(id) on delete cascade;
  end if;
end $$;

alter table public.submissions      alter column org_id set not null;
alter table public.messages         alter column org_id set not null;
alter table public.gmail_sync_state alter column org_id set not null;

create index if not exists submissions_org_id_idx       on public.submissions(org_id);
create index if not exists messages_org_id_idx          on public.messages(org_id);
create index if not exists gmail_sync_state_org_id_idx  on public.gmail_sync_state(org_id);

-- =============================================================================
-- 6. ADD TYLER AS BACKBONE_ADMIN
-- =============================================================================

do $$
declare
  v_user_id uuid;
  v_org_id uuid;
begin
  select id into v_user_id from auth.users where email = 'tyler@backbonemade.com' limit 1;
  select id into v_org_id  from public.orgs   where slug = 'backbone-hq';

  if v_user_id is null then
    raise notice
      '[phase-5] tyler@backbonemade.com not found in auth.users. '
      'Re-run this membership insert manually after the user is created.';
  elsif v_org_id is null then
    raise exception '[phase-5] backbone-hq org missing. Re-run section 2.';
  else
    insert into public.org_memberships (user_id, org_id, role)
    values (v_user_id, v_org_id, 'backbone_admin')
    on conflict (user_id, org_id) do update set role = 'backbone_admin';
  end if;
end $$;

-- =============================================================================
-- 7. HELPER FUNCTIONS USED BY RLS
-- =============================================================================

create or replace function public.is_backbone_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.org_memberships
     where user_id = auth.uid()
       and role = 'backbone_admin'
  )
$$;

create or replace function public.user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id
    from public.org_memberships
   where user_id = auth.uid()
   limit 1
$$;

grant execute on function public.is_backbone_admin() to authenticated;
grant execute on function public.user_org_id() to authenticated;

-- =============================================================================
-- 8. RLS ON NEW TABLES
-- =============================================================================

alter table public.orgs              enable row level security;
alter table public.org_memberships   enable row level security;
alter table public.audit_log         enable row level security;

-- ----- orgs -----
drop policy if exists "orgs_select" on public.orgs;
create policy "orgs_select"
  on public.orgs
  for select
  to authenticated
  using (
    public.is_backbone_admin()
    or id = public.user_org_id()
  );

drop policy if exists "orgs_insert" on public.orgs;
create policy "orgs_insert"
  on public.orgs
  for insert
  to authenticated
  with check (public.is_backbone_admin());

drop policy if exists "orgs_update" on public.orgs;
create policy "orgs_update"
  on public.orgs
  for update
  to authenticated
  using (
    public.is_backbone_admin()
    or id = public.user_org_id()
  )
  with check (
    public.is_backbone_admin()
    or id = public.user_org_id()
  );

drop policy if exists "orgs_delete" on public.orgs;
create policy "orgs_delete"
  on public.orgs
  for delete
  to authenticated
  using (public.is_backbone_admin());

-- ----- org_memberships -----
drop policy if exists "org_memberships_select" on public.org_memberships;
create policy "org_memberships_select"
  on public.org_memberships
  for select
  to authenticated
  using (
    public.is_backbone_admin()
    or user_id = auth.uid()
  );

drop policy if exists "org_memberships_insert" on public.org_memberships;
create policy "org_memberships_insert"
  on public.org_memberships
  for insert
  to authenticated
  with check (public.is_backbone_admin());

drop policy if exists "org_memberships_update" on public.org_memberships;
create policy "org_memberships_update"
  on public.org_memberships
  for update
  to authenticated
  using (public.is_backbone_admin())
  with check (public.is_backbone_admin());

drop policy if exists "org_memberships_delete" on public.org_memberships;
create policy "org_memberships_delete"
  on public.org_memberships
  for delete
  to authenticated
  using (public.is_backbone_admin());

-- ----- audit_log (append-only) -----
drop policy if exists "audit_log_select" on public.audit_log;
create policy "audit_log_select"
  on public.audit_log
  for select
  to authenticated
  using (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  );

drop policy if exists "audit_log_insert" on public.audit_log;
create policy "audit_log_insert"
  on public.audit_log
  for insert
  to authenticated
  with check (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  );

-- No update or delete policies. Audit log is append-only.

-- =============================================================================
-- 9. UPDATE RLS ON EXISTING TENANT TABLES
-- =============================================================================
-- Strategy: drop legacy policies, replace with org-scoped ones. Service role
-- bypasses RLS by default (it is the postgres superuser equivalent in
-- supabase-js admin client) so no explicit service role policy is needed.

-- ----- submissions -----
drop policy if exists "Anyone can insert submissions"            on public.submissions;
drop policy if exists "Authenticated users can view submissions" on public.submissions;
drop policy if exists "Authenticated users can update submissions" on public.submissions;
drop policy if exists "submissions_select" on public.submissions;
drop policy if exists "submissions_insert" on public.submissions;
drop policy if exists "submissions_update" on public.submissions;
drop policy if exists "submissions_delete" on public.submissions;

create policy "submissions_select"
  on public.submissions
  for select
  to authenticated
  using (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  );

create policy "submissions_insert"
  on public.submissions
  for insert
  to authenticated
  with check (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  );

create policy "submissions_update"
  on public.submissions
  for update
  to authenticated
  using (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  )
  with check (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  );

create policy "submissions_delete"
  on public.submissions
  for delete
  to authenticated
  using (public.is_backbone_admin());

-- ----- messages -----
drop policy if exists "Authenticated users can view messages"   on public.messages;
drop policy if exists "Authenticated users can insert messages" on public.messages;
drop policy if exists "Service role can insert messages"        on public.messages;
drop policy if exists "Authenticated users can update messages" on public.messages;
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;
drop policy if exists "messages_update" on public.messages;
drop policy if exists "messages_delete" on public.messages;

create policy "messages_select"
  on public.messages
  for select
  to authenticated
  using (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  );

create policy "messages_insert"
  on public.messages
  for insert
  to authenticated
  with check (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  );

create policy "messages_update"
  on public.messages
  for update
  to authenticated
  using (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  )
  with check (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  );

create policy "messages_delete"
  on public.messages
  for delete
  to authenticated
  using (public.is_backbone_admin());

-- ----- gmail_sync_state -----
drop policy if exists "Service role can read sync state"   on public.gmail_sync_state;
drop policy if exists "Service role can insert sync state" on public.gmail_sync_state;
drop policy if exists "Service role can update sync state" on public.gmail_sync_state;
drop policy if exists "gmail_sync_state_select" on public.gmail_sync_state;
drop policy if exists "gmail_sync_state_insert" on public.gmail_sync_state;
drop policy if exists "gmail_sync_state_update" on public.gmail_sync_state;
drop policy if exists "gmail_sync_state_delete" on public.gmail_sync_state;

create policy "gmail_sync_state_select"
  on public.gmail_sync_state
  for select
  to authenticated
  using (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  );

create policy "gmail_sync_state_insert"
  on public.gmail_sync_state
  for insert
  to authenticated
  with check (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  );

create policy "gmail_sync_state_update"
  on public.gmail_sync_state
  for update
  to authenticated
  using (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  )
  with check (
    public.is_backbone_admin()
    or org_id = public.user_org_id()
  );

create policy "gmail_sync_state_delete"
  on public.gmail_sync_state
  for delete
  to authenticated
  using (public.is_backbone_admin());

-- =============================================================================
-- 10. JWT HOOK: inject org_id and org_role into access token claims
-- =============================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_claims     jsonb;
  v_org_id     uuid;
  v_org_role   text;
begin
  select om.org_id, om.role
    into v_org_id, v_org_role
    from public.org_memberships om
   where om.user_id = (event ->> 'user_id')::uuid
   order by case when om.role = 'backbone_admin' then 0 else 1 end
   limit 1;

  v_claims := event -> 'claims';

  if v_org_id is not null then
    v_claims := jsonb_set(v_claims, '{org_id}',   to_jsonb(v_org_id::text));
    v_claims := jsonb_set(v_claims, '{org_role}', to_jsonb(v_org_role));
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.org_memberships to supabase_auth_admin;

-- =============================================================================
-- 11. AUDIT TRIGGER FUNCTION (defined but NOT attached to tables yet)
-- =============================================================================
-- Per spec: keep audit logging explicit on a per-module basis. This function
-- is here so attaching it to a table later is a one-line CREATE TRIGGER.

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  v_org_id := coalesce(
    (case when tg_op != 'DELETE' then (new.org_id)::uuid end),
    (case when tg_op != 'INSERT' then (old.org_id)::uuid end)
  );

  insert into public.audit_log
    (org_id, user_id, action, resource_type, resource_id, before, after)
  values (
    v_org_id,
    auth.uid(),
    tg_op || '.' || tg_table_name,
    tg_table_name,
    coalesce(
      (case when tg_op != 'DELETE' then new.id end),
      (case when tg_op != 'INSERT' then old.id end)
    ),
    case when tg_op != 'INSERT' then to_jsonb(old) else null end,
    case when tg_op != 'DELETE' then to_jsonb(new) else null end
  );

  return coalesce(
    case when tg_op != 'DELETE' then new end,
    old
  );
end;
$$;

# PHASE 5 v1 ARCHITECTURE

Backbone client panel + multi-tenant content system.
First client: Conway Comfort HVAC.

Status: Draft for Tyler review.
Date: 2026-05-07.

---

## SCOPE OF THIS DOC

This doc covers Phase 5 v1: the first version of the productized client panel that ships with Conway and every Backbone client after.

What's IN scope for v1:
- Single-user-per-tenant access (the business owner)
- Data-driven content editing (text, images, hours, services, contact, basic theme)
- Multi-tenant database with proper isolation
- Real server-side auth, audit log, schema-in-code, RLS from day 1
- Lead/submission view (mirrors what Backbone HQ already has)

What's OUT of scope for v1, deferred to v2 or later:
- Multi-user roles with section-level permissions
- AI-assisted edits as paid add-on
- Custom domain mapping
- White-label/reseller theming
- Code-generation model (changing actual code via panel)
- Add/remove pages with custom templates

The discipline: every feature deferred is a feature you don't have to maintain in v1. Conway needs a working panel he can use. Three more clients will tell you what v2 actually needs.

---

## 1. MULTI-TENANCY MODEL

### The core decision: shared database, isolated by orgId

Every table that holds tenant-specific data has an `org_id` column. RLS policies enforce that any query is scoped to the current user's org. One Supabase project hosts data for all Backbone clients. Cheaper, simpler ops, faster to build.

### Schema pattern

Every tenant-owned row carries `org_id uuid not null references orgs(id) on delete cascade`. Every RLS policy on tenant tables looks roughly like:

```sql
create policy "tenant_isolation"
  on tenant_table
  for all
  to authenticated
  using (org_id = auth.jwt() ->> 'org_id'::uuid)
  with check (org_id = auth.jwt() ->> 'org_id'::uuid);
```

The `org_id` claim gets injected into the JWT at login time via a Supabase auth hook, so every query the user makes is automatically scoped without the app having to remember.

### The orgs table

```sql
create table orgs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                -- conway, joes-pizza, etc.
  business_name text not null,              -- "Conway Comfort HVAC"
  status text not null default 'active'     -- active, suspended, archived
    check (status in ('active', 'suspended', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

The slug is the URL identifier (e.g. `conway.backbonemade.com` or `panel.backbonemade.com/conway`).

### What lives in the shared database vs each client's site

Shared Supabase project (one DB, many tenants):
- All client content (text, theme, images, services, hours, contact)
- All client lead submissions
- All client user accounts and sessions
- Audit log
- Backbone HQ data (your internal admin)

Each client's deployed site (separate Vercel project per client):
- Reads from the shared Supabase using their own scoped JWT
- No separate database per client
- Renders content based on the org's data

This means: when Conway changes his hours in the panel, the panel writes to Supabase, Conway's site reads the new value on next render. No deploy, no rebuild, instant.

---

## 2. DEPLOYMENT TOPOLOGY

### Three Vercel projects (initially, scales with each client)

**1. Backbone HQ** (`backbonemade.com`)
- Tyler's internal admin (already exists, current Phase 1-3 work)
- Tyler manages all clients, sees all submissions, runs operations
- Auth: Tyler's account only

**2. Backbone Client Panel** (`panel.backbonemade.com`)
- The shared client-facing panel
- All clients log in here
- Multi-tenant: shows only the logged-in client's data
- One codebase serving all clients

**3. Conway's Site** (`conwaycomfort.com` or similar)
- The actual public marketing site for Conway
- Reads content from Supabase via the shared org_id
- Per-client Vercel project (one per client going forward)
- Renders based on the org's data

When client #2 (Joe's Pizza) signs on:
- Add a new row to `orgs` table
- Spin up a new Vercel project for Joe's site
- Connect Joe's Vercel to the same Supabase, scoped to his org_id
- Joe logs into the same `panel.backbonemade.com` with his own creds, sees only his data

### Why three projects, not one

Could combine the panel + each client's site into one app, but separating them means:
- Each client's site can have wildly different design without affecting the panel
- Panel can deploy independently of client sites
- A bug in the panel doesn't take down client sites
- Clients keep their own custom domain on their own Vercel project

### The cost math

- Backbone HQ: Vercel Hobby (or Pro for team scaling)
- Client Panel: Vercel Pro $20/mo (covers the panel for all clients)
- Each client site: Vercel Pro $20/mo per client (or charged to client)
- Shared Supabase: Pro $25/mo (covers many tenants until DB hits limits)

Marginal cost per client to YOU: ~$0 if client pays for their own Vercel, or ~$20/mo if Backbone covers it. Either way, way under the $5/mo target marginal cost.

---

## 3. AUTH MODEL

### Two separate auth systems

**Backbone HQ auth:**
- Tyler logs into `backbonemade.com/admin` with his account
- Existing Phase 1-3 setup, no changes
- Tyler has access to ALL orgs, can impersonate any client (view-as)

**Client Panel auth:**
- Conway logs into `panel.backbonemade.com` with `conway@conwaycomfort.com`
- Supabase Auth handles credentials
- JWT carries `org_id` claim that scopes everything via RLS
- Conway never sees other clients' data

### How org_id gets into the JWT

Use a Supabase auth hook (Custom Access Token Hook) that runs on every token refresh. The hook:
1. Looks up the user's `org_memberships` row to find their org_id
2. Adds `org_id` as a custom claim in the JWT
3. RLS policies read `auth.jwt() ->> 'org_id'` on every query

For v1: every user has exactly one org membership. Simple lookup. v2+ might support multi-org users but defer that.

### org_memberships table

```sql
create table org_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  role text not null default 'owner'         -- v1: only 'owner'. v2: more roles.
    check (role in ('owner')),
  created_at timestamptz default now(),
  unique(user_id, org_id)
);
```

In v1, the role column always says 'owner'. v2 expands this to admin/staff/viewer/etc.

### Tyler impersonation (view-as) for client support

Lift this directly from Serenyx. Tyler can impersonate any client from Backbone HQ for support purposes. When Tyler clicks "view-as Conway", the system:
1. Logs the impersonation in the audit log (critical)
2. Issues a temp JWT scoped to Conway's org_id
3. Tyler navigates the client panel as Conway
4. Banner at top of every page: "VIEWING AS CONWAY — EXIT"
5. Exits return Tyler to his Backbone HQ session

This is the support feature, not a power move. When Conway calls saying "the booking form is broken," Tyler clicks view-as and sees exactly what Conway sees.

---

## 4. EDITABLE CONTENT SCHEMA (THE PANEL'S CORE)

### The mental model: a content schema per "module"

Each thing the client can edit is a structured row (or set of rows) in the database. The panel renders forms to edit those rows. The site renders pages from those rows.

For Conway's HVAC site, the modules are roughly:

**Business Info** (singleton — one row per org)
- Business name
- Tagline
- Logo URL
- Phone, email, address
- Hours (structured: {monday: "8am-5pm", tuesday: ..., closed: false})
- Service area (text)
- Social links (Facebook, Google Business URL, etc.)

**Services** (list — many rows per org)
- Service name (e.g. "AC Repair")
- Short description
- Long description
- Featured image
- Price range or "Call for quote"
- Display order
- Active/inactive

**Testimonials** (list — many rows per org)
- Customer name
- Customer location (e.g. "Indianapolis, IN")
- Quote
- Rating (1-5 stars)
- Photo (optional)
- Display order
- Active/inactive

**FAQ** (list — many rows per org)
- Question
- Answer
- Display order
- Active/inactive

**Theme** (singleton — one row per org)
- Primary color (constrained palette: 6-8 preset options + "custom hex")
- Accent color
- Font pair (constrained: 4-6 preset combos)

**Pages** (v2 — for now, hardcoded page set per vertical)

**Submissions** (read-only view of leads, mirrors Phase 1-3 admin)

### Design constraint: structured, not freeform

The client never writes raw HTML. They never see code. They fill out structured forms. The site renders content from the structured data using fixed templates.

This is the boundary that prevents them from breaking things. They literally cannot edit layout, navigation structure, or anything that affects how the site renders globally.

If they want a brand new page or a structural change, they email Backbone. v2 might add page-builder features. v1 doesn't.

### The schema-as-config pattern

Each module has:
- A Postgres table (or set of tables) for the data
- A JSON schema (Zod or similar) defining the shape and validation rules
- A React form component that renders the editor
- A renderer component that displays it on the public site

When you onboard client #2, you might add modules specific to their vertical (a restaurant gets "menu items" instead of "services"). The framework supports adding new modules without breaking existing ones.

For v1, ship the modules above. They cover Conway and most service-business clients you'll see early.

---

## 5. DAY-1 NON-NEGOTIABLES (BACKBONE LESSONS FROM SERENYX)

### Real server-side auth on EVERY route

The Serenyx writeup flagged a `verifyAdmin()` stub that always returns success. Three production routes accept any authenticated request as admin. This must NEVER happen in Backbone.

For Backbone:
- Every server action validates the session AND checks org membership AND checks role permissions before any database operation
- A shared `requireOrgRole(orgId, role)` helper guards every protected operation
- Middleware enforces auth at the route level for `/panel/*` paths
- No client-side-only gates. Every gate exists server-side too.

### Audit log on day 1

Serenyx skipped this and regrets it. Backbone gets one from launch.

```sql
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references orgs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,                      -- 'business_info.update', 'service.delete', etc.
  resource_type text,                        -- 'service', 'theme', 'business_info'
  resource_id uuid,                          -- which row was affected
  before jsonb,                              -- snapshot of old data
  after jsonb,                               -- snapshot of new data
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create index audit_log_org_id_created_at_idx on audit_log(org_id, created_at desc);
```

Every mutating server action logs to this table. Tyler can review actions on any client's account. Clients can review their own actions in v2.

### Schema lives in code, not in a UI

Use Supabase migrations checked into git. Schema changes go through code review (Tyler reviewing his own commits, but explicitly). Never click around in the Supabase dashboard to add columns. The Serenyx schema-drift problem (collections that exist in Appwrite but not in `appwrite.json`) doesn't happen if the dashboard isn't a source of truth.

Tools: Supabase CLI for migrations, `supabase/migrations/` directory in the Backbone repo, every migration is version-controlled.

### RLS policies on every tenant table

Every table that has `org_id` gets an RLS policy enforcing isolation. Test it. Write a SQL test that inserts data for org A, switches to a session for org B, and confirms org B can't see org A's data. Run it on every migration.

### Rate limiting and abuse prevention

Add Supabase rate limits or a thin Vercel middleware that throttles writes per session. A client going crazy clicking save 100 times/second shouldn't bring down anything.

---

## 6. MVP FEATURE LIST (CONWAY v1)

### Panel features Conway gets

1. **Login** — `panel.backbonemade.com`, email + password, magic link option
2. **Dashboard** — overview of recent submissions, quick links to common edits
3. **Business Info edit** — single form for name/phone/address/hours/etc.
4. **Services management** — add/edit/delete/reorder services
5. **Testimonials management** — add/edit/delete/reorder testimonials
6. **FAQ management** — add/edit/delete/reorder FAQ entries
7. **Theme** — color and font selector with preview
8. **Submissions inbox** — view leads from his contact form (the same Phase 3 work, scoped to his org)
9. **Settings** — change password, view account info

### Conway's public site

A new Backbone client site, deployed as its own Vercel project, reading from the shared Supabase. Pages:
- Home (hero, services preview, testimonials preview, contact CTA)
- Services (full list with detail pages)
- About (business info, service area, hours)
- FAQ
- Contact (form that submits to Supabase, scoped to org)

Designed by Tyler, customizable by Conway via the panel. Theme tokens (colors, fonts) pulled from `theme` row.

### What Conway doesn't get in v1

- Multi-user roles (he's the only user)
- Add/remove pages
- Custom layouts
- Code-level editing
- AI edits
- Analytics dashboards (use Vercel Analytics or Plausible directly)

---

## 7. WHAT'S LIFTED FROM SERENYX

Direct copy-paste candidates (with light renaming):
- `AdminTable` (and its sortable, drag-reorder, expanded-row primitives)
- `AdminDialog` (typed form fields)
- `AdminFilters` (filter UI patterns)
- `useAdminPageState` (sessionStorage-backed filter/search state)
- `view-as` impersonation flow
- Pipeline status visualization (for any future async ops)
- Granular role+scope data model (kept dormant in v1, lit up in v2)

Lifting plan:
1. Create a `packages/admin-ui` workspace in the Backbone monorepo (or just a `src/components/admin-ui` directory)
2. Copy the relevant components from Serenyx
3. Strip out esports-specific bindings (REP, divisions, callouts, etc.)
4. Generalize props and types
5. Use them in both Backbone HQ and the Client Panel

This is mostly a copy-and-clean job. Maybe a day of work to get the primitives in place.

---

## 8. WHAT'S NEW FOR BACKBONE (NOT IN SERENYX)

- Multi-tenant database design (Serenyx is single-tenant)
- RLS for tenant isolation
- Custom auth claim injection (org_id in JWT)
- Audit log infrastructure
- Per-tenant deployments (Conway gets his own Vercel project)
- Content module framework (the schema-as-config pattern)
- Real server-side auth enforcement across the board

---

## 9. ROADMAP BEYOND v1

### v2 (after Conway is using v1 for 1-3 months)
- Multi-user roles with section-level permissions
- Add/remove/reorder pages with constrained templates
- Blog/news posts module
- Basic analytics view
- Theme controls expanded (more typography options, layout density, etc.)
- Email integration (sending newsletters from the panel)

### v3 (after 5+ clients are on v2)
- Custom domain mapping (clients use their own domains, Backbone handles cert automation)
- White-label theming (some clients want the panel branded as theirs, not Backbone)
- AI-assisted edits as paid add-on (with metered billing per use)
- Inline preview mode (see changes before publishing)
- Versioning + undo for major edits

### v4+ (parking lot)
- Code-generation model (real code changes via Git API)
- Plugin/integration marketplace
- Multi-language/i18n support
- Reseller/agency tier

---

## 10. KEY DECISIONS FOR TYLER TO CONFIRM

Before any build prompt gets written, confirm or push back on these:

1. **Multi-tenant via shared Supabase + org_id** — yes/no. (Alternative: separate Supabase project per client. More expensive, more isolated. Recommended NO for v1.)

2. **Three Vercel projects (Backbone HQ + Client Panel + per-client sites)** — yes/no. (Alternative: combine panel into client sites. Trades flexibility for simplicity. Recommended as drafted.)

3. **Conway's public site is brand new, deployed as its own Vercel project** — confirms that we're not retrofitting an existing Conway site, we're building from scratch using the new content module framework.

4. **MVP module list (business info, services, testimonials, FAQ, theme, submissions)** — anything to add or remove?

5. **Auth: separate sessions for Tyler (Backbone HQ) and Conway (Client Panel)** — Tyler logs into both with the same Supabase Auth, but his role determines what he sees. Confirms one Supabase Auth instance, not two.

6. **The 4 day-1 non-negotiables (real server-side auth, audit log, schema-in-code, RLS everywhere)** — agreed and locked.

7. **v2 features explicitly deferred** — agreed multi-user roles, AI edits, custom domains, etc. wait until after Conway ships?

---

## NEXT STEP

Once Tyler confirms or amends the above, write Phase 5 build prompts in this order:

1. **Setup prompt** — Create the new Supabase project (or schemas in existing), define the orgs/org_memberships/audit_log tables, RLS policies, JWT hook for org_id claim
2. **Lift admin-ui prompt** — Pull the reusable primitives from Serenyx, generalize, drop into Backbone repo
3. **Build the Client Panel app prompt** — New Vercel project, Supabase Auth integration, base layout
4. **Module: Business Info prompt** — First content module end-to-end (table, RLS, form, renderer)
5. **Repeat for each module** (services, testimonials, FAQ, theme)
6. **Conway's public site prompt** — New Vercel project, fetches content via Supabase, renders with module data
7. **view-as impersonation prompt** — Tyler can impersonate Conway from Backbone HQ
8. **Audit log integration prompt** — Wire every mutating action to audit_log
9. **Polish + handoff prompt** — Onboarding video for Conway, password setup flow, email transport

Each prompt is bounded, has clear deliverables, and runs through Claude Code with verification before the next.

End of v1 architecture draft.

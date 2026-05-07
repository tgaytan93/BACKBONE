# Backbone — Roadmap

Internal planning doc. Phases below are sequential — each ships before the next starts.

---

## Active priorities

- **Phase 4 — Project + Contract Management** is next. Trigger: first inquiry that converts to `won` and needs project tracking beyond a submission row.
- Polish backlog from Phase 3 (deferred, not blocking): threading via In-Reply-To/References headers, spam UI for the existing `spam` enum value, global unread badge in admin nav.

---

## Phase 1 — Submissions + Admin Auth ✅ SHIPPED

- [x] Public contact form posts to Supabase
- [x] `/admin/login` with Supabase Auth (single user)
- [x] `/admin` dashboard with stat strip + submissions table
- [x] `/admin/submissions/[id]` detail view with status + notes
- [x] RLS policies (anon insert only; authenticated read/update)
- [x] Deployed to Vercel with env vars wired
- [x] End-to-end verified in production

---

## Phase 2 — Outbound Email Replies

Goal: reply to a submission directly from `/admin/submissions/[id]` and have a real email send from the Backbone domain. Source of truth stays in the panel.

- [ ] Resend account + domain verification (`backbonemade.com`)
- [ ] DNS records for Resend (subdomain like `mail.backbonemade.com` to keep transactional separate from human inbox)
- [ ] `messages` table in Supabase (linked to submission_id, direction='outbound', body, subject, sent_at, status)
- [ ] API route `/api/messages/send` — accepts message body, sends via Resend, logs to `messages` table
- [ ] UI: reply composer inside submission detail page, threaded message history above it
- [ ] Email templates: branded HTML wrapper, plain-text fallback, signature block
- [ ] Status indicators: sent / delivered / bounced (Resend webhook)

---

## Phase 3 — Inbound Email Parsing ✅ SHIPPED

Goal: when a client replies to one of Tyler's emails, the reply appears in the panel automatically and threads under the right submission.

Architecture pivot from original plan: replies go to `tyler@backbonemade.com` (a Workspace inbox), not a parse address, so Resend inbound webhooks don't help. Built on Gmail API + OAuth refresh token + cron sync instead. No service account keys (org policy blocks them).

- [x] Gmail API OAuth via internal-Workspace consent app, refresh token stored in env
- [x] Vercel cron (`*/5 * * * *`) hits `/api/gmail/sync`, bearer-auth'd by `CRON_SECRET`
- [x] History API watermark with 7-day time-window backfill fallback when watermark expires
- [x] Filter rules for automated noise (noreply local-parts, registrar/platform automated mailboxes, subject patterns) — editable constants at top of `match.ts`
- [x] Full inbox mode with three states: `attached`, `unmatched`, `archived`. UNMATCHED triage queue on the dashboard with inline ATTACH / CREATE SUBMISSION / DISMISS actions
- [x] UI: realtime updates via Supabase channels on `messages` and `submissions` tables (INSERT, UPDATE, DELETE) with `REPLICA IDENTITY FULL`
- [x] Read/unread state per inbound message, auto-marked read on thread view, cyan dot + count emphasis on submissions table
- [x] Submission status state machine: `new` → (view) → `needs_response` → (manual send) → `contacted`
- [x] Submission-level kebab on dashboard for in-row status changes and delete (cascades to messages via FK)
- [x] Compose composer with smart subject defaults (auto `Re:` from latest thread subject, hidden behind `EDIT SUBJECT` toggle)
- [x] Persistent thread subject set to `Tyler from Backbone` so it ages across the project lifecycle

Deferred for later:
- Threading via In-Reply-To / References headers (strict from-address matching covers current use cases)
- Spam UI surface (the `spam` enum value exists; no path to it from admin yet)
- Global unread badge in admin nav (per-row counts exist; nav-level summary doesn't)

---

## Phase 4 — Project + Contract Management

Goal: once a submission becomes a client, link them to an active project with stage tracking, deliverables, and contract status.

- [ ] `clients` table (graduated from submissions when status = 'won')
- [ ] `projects` table (client_id, tier, scope, price, start_date, target_date, current_stage)
- [ ] Stage tracking: discovery → scope → build → handoff
- [ ] `/admin/clients` and `/admin/clients/[id]` views
- [ ] Contract upload/storage (Supabase Storage)
- [ ] Optional: invoice tracking, payment status

---

## Phase 5 — DevOps Panel (Productized Feature)

**This is shipped WITH every Backbone client site, not just the Backbone admin panel.**

Reference implementation: Maxwell HQ in the Serenyx project. Pattern adapted for Backbone deliverables.

Goal: every client gets a panel inside their site's `/admin` where they can:
- File bug reports against their own site
- Have those reports AI-enhanced into actionable prompts
- Watch deployment status in real-time
- Edit static page content without calling Tyler

### DevOps panel — module structure

- [ ] Bug report form (title, description, severity, page URL, screenshot upload, error message)
- [ ] AI enhancement step (raw report → structured prompt via Claude API)
- [ ] Push to agent / work queue (sends enhanced prompt to Tyler's queue, OR direct-to-Claude-Code via webhook)
- [ ] Deployment tracker (GitHub webhook → updates ticket status: queued → building → deployed)
- [ ] Static content editor (per-page editable fields stored in Supabase, rendered into the live site)

### Productization notes

- Built as a reusable Next.js module (potentially own package or shared template)
- Each client gets their own daemon-name and voice (Maxwell for Serenyx; different for each client to feel custom)
- For Backbone-internal use: precision technical voice, no gen-z personality
- Per-client RLS scoping if multi-tenant; or per-client deployments
- This is the productized SaaS-future of Backbone — repeat pattern across every build

---

## Phase 6 — File + Contract Storage

- [ ] Supabase Storage bucket per client
- [ ] Contract upload + signature workflow (Documenso integration or similar)
- [ ] Project files (deliverables, mockups, brand assets)
- [ ] Client-facing portal view (read-only) for files + project status

---

## Out of scope (intentionally)

- Multi-team admin (only Tyler ever logs in)
- Public client signup flows
- Calendar booking on the marketing site (use Cal.com or Google Calendar share link if needed)
- Building agentic SEO tooling (Tyler resells Alli AI when ready)
- Stripe direct integration (handled per-project as needed, not centralized)

---

## Working principles

- Each phase ships and gets verified in production before the next starts
- Each phase is shippable on its own — no half-built phases sitting in branches
- Email and panel coexist; panel is source of truth, email is channel
- Productized features (Phase 5) get extracted into reusable modules so they ship with every client
- Brand discipline: every screen, including admin, uses Backbone visual language

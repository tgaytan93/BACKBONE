# Backbone — Roadmap

Internal planning doc. Phases below are sequential — each ships before the next starts.

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

## Phase 3 — Inbound Email Parsing

Goal: when a client replies to one of Tyler's emails, the reply appears in the panel automatically and threads under the right submission.

- [ ] Resend inbound parsing webhook configured
- [ ] API route `/api/messages/inbound` — receives parsed email, matches to submission by from-address, inserts as direction='inbound'
- [ ] UI: real-time updates via Supabase subscriptions (panel refreshes when new inbound arrives)
- [ ] Threading: handle In-Reply-To and References headers correctly
- [ ] Spam handling: basic filter + manual mark-as-spam action
- [ ] Unread state per submission, dashboard shows unread count

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

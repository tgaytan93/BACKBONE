-- Backbone Phase 3 status state machine
-- Adds 'needs_response' to submissions.status. Auto-transitions:
--   new           -> needs_response   on first detail-page view
--   needs_response -> contacted        on first manual outbound send
--
-- Run in Supabase SQL Editor. Idempotent.

alter table public.submissions drop constraint if exists submissions_status_check;
alter table public.submissions
  add constraint submissions_status_check
  check (status in ('new', 'needs_response', 'contacted', 'qualified', 'won', 'lost'));

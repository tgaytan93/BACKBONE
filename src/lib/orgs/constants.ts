import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// Phase 5 v1 puts all of Tyler's existing data under a single tenant slug,
// 'backbone-hq'. Routes that don't have a session context (the public contact
// form, the gmail sync cron) need this org_id to satisfy NOT NULL on tenant
// tables. The actual UUID differs per environment, so we look up by slug and
// cache for the lifetime of the process.

let cachedId: string | null = null;

export async function getBackboneHqOrgId(): Promise<string> {
  if (cachedId) return cachedId;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('orgs')
    .select('id')
    .eq('slug', 'backbone-hq')
    .single();
  if (error || !data) {
    throw new Error(
      'backbone-hq org not found. Run supabase-phase-5-foundation.sql.'
    );
  }
  cachedId = data.id as string;
  return cachedId;
}

import 'server-only';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSessionContext } from '@/lib/auth/session';

type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [k: string]: Json };

export type AuditEvent = {
  action: string;
  resourceType?: string;
  resourceId?: string | null;
  before?: Json | null;
  after?: Json | null;
  // Override org if the actor is acting outside their own org (e.g. backbone_admin
  // operating on a specific tenant). Defaults to ctx.orgId.
  orgId?: string | null;
};

function pickIp(h: Headers): string | null {
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return h.get('x-real-ip') ?? null;
}

// Fire-and-forget. Never throws into the calling action; logs failures to console.
// Uses the admin client so audit writes succeed even when the actor's RLS would
// reject (e.g. logging a delete that just happened).
export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const ctx = await getSessionContext();
    if (!ctx) return;

    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ip = pickIp(h);
      userAgent = h.get('user-agent');
    } catch {
      // headers() throws outside of a request scope; non-fatal.
    }

    const admin = createAdminClient();
    const { error } = await admin.from('audit_log').insert({
      org_id: event.orgId ?? ctx.orgId,
      user_id: ctx.userId,
      action: event.action,
      resource_type: event.resourceType ?? null,
      resource_id: event.resourceId ?? null,
      before: event.before ?? null,
      after: event.after ?? null,
      ip_address: ip,
      user_agent: userAgent,
    });
    if (error) {
      console.error('[audit] insert failed', event.action, error);
    }
  } catch (err) {
    console.error('[audit] unexpected error', event.action, err);
  }
}

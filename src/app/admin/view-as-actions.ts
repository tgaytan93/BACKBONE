'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireBackboneAdmin } from '@/lib/auth/require';
import { logAuditEvent } from '@/lib/audit/log';

export type ActiveViewAsSession = {
  sessionId: string;
  targetOrgId: string;
  isLocked: boolean;
};

async function readActiveSession(
  adminUserId: string
): Promise<ActiveViewAsSession | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('view_as_sessions')
    .select('id, target_org_id, is_locked')
    .eq('admin_user_id', adminUserId)
    .is('ended_at', null)
    .maybeSingle();
  if (error) {
    console.error('[view-as] read active session failed', error);
    return null;
  }
  if (!data) return null;
  return {
    sessionId: data.id as string,
    targetOrgId: data.target_org_id as string,
    isLocked: data.is_locked as boolean,
  };
}

export async function getActiveViewAsSession(): Promise<{
  session: ActiveViewAsSession | null;
  error: string | null;
}> {
  try {
    const ctx = await requireBackboneAdmin();
    const session = await readActiveSession(ctx.userId);
    return { session, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized.';
    return { session: null, error: msg };
  }
}

export async function startViewAs(
  targetOrgId: string,
  options?: { locked?: boolean }
) {
  let ctx;
  try {
    ctx = await requireBackboneAdmin();
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unauthorized.',
    };
  }
  if (!targetOrgId) return { error: 'targetOrgId required.' };

  const admin = createAdminClient();

  // End any active session first so the unique partial index doesn't trip.
  await admin
    .from('view_as_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('admin_user_id', ctx.userId)
    .is('ended_at', null);

  const { data: created, error } = await admin
    .from('view_as_sessions')
    .insert({
      admin_user_id: ctx.userId,
      target_org_id: targetOrgId,
      is_locked: options?.locked ?? false,
    })
    .select('id, target_org_id, is_locked')
    .single();

  if (error || !created) {
    return { error: error?.message ?? 'Failed to start view-as session.' };
  }

  await logAuditEvent({
    action: 'view_as.start',
    resourceType: 'view_as_session',
    resourceId: created.id,
    orgId: targetOrgId,
    after: { target_org_id: targetOrgId, is_locked: created.is_locked },
  });

  revalidatePath('/admin');
  return {
    ok: true,
    session: {
      sessionId: created.id as string,
      targetOrgId: created.target_org_id as string,
      isLocked: created.is_locked as boolean,
    } as ActiveViewAsSession,
  };
}

export async function endViewAs() {
  let ctx;
  try {
    ctx = await requireBackboneAdmin();
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unauthorized.',
    };
  }

  const admin = createAdminClient();
  const active = await readActiveSession(ctx.userId);
  if (!active) {
    return { ok: true };
  }

  const { error } = await admin
    .from('view_as_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', active.sessionId);

  if (error) return { error: error.message };

  await logAuditEvent({
    action: 'view_as.end',
    resourceType: 'view_as_session',
    resourceId: active.sessionId,
    orgId: active.targetOrgId,
  });

  revalidatePath('/admin');
  return { ok: true };
}

export async function setViewAsLocked(locked: boolean) {
  let ctx;
  try {
    ctx = await requireBackboneAdmin();
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Unauthorized.',
    };
  }

  const active = await readActiveSession(ctx.userId);
  if (!active) {
    return { error: 'No active view-as session.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('view_as_sessions')
    .update({ is_locked: locked })
    .eq('id', active.sessionId);

  if (error) return { error: error.message };

  await logAuditEvent({
    action: 'view_as.set_locked',
    resourceType: 'view_as_session',
    resourceId: active.sessionId,
    orgId: active.targetOrgId,
    before: { is_locked: active.isLocked },
    after: { is_locked: locked },
  });

  revalidatePath('/admin');
  return { ok: true };
}

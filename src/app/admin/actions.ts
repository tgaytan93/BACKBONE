'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncGmail } from '@/lib/gmail/poll';

const ALLOWED_STATUSES = [
  'new',
  'needs_response',
  'contacted',
  'qualified',
  'won',
  'lost',
] as const;
type Status = (typeof ALLOWED_STATUSES)[number];

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export async function updateStatus(id: string, status: Status) {
  if (!ALLOWED_STATUSES.includes(status)) {
    return { error: 'Invalid status.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('submissions')
    .update({ status })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/submissions/${id}`);
  revalidatePath('/admin');
  return { ok: true };
}

export async function triggerGmailSync(submissionId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized.' };
  }
  try {
    const result = await syncGmail();
    if (submissionId) {
      revalidatePath(`/admin/submissions/${submissionId}`);
    }
    revalidatePath('/admin');
    return { ok: true, result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed.';
    return { error: msg };
  }
}

export async function recoverInbox() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized.' };
  }
  try {
    const result = await syncGmail({ mode: 'recover' });
    revalidatePath('/admin');
    return { ok: true, result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Recover failed.';
    return { error: msg };
  }
}

export async function attachMessage(messageId: string, submissionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized.' };
  }
  if (!messageId || !submissionId) {
    return { error: 'messageId and submissionId required.' };
  }
  const { error } = await supabase
    .from('messages')
    .update({ submission_id: submissionId, status: 'attached' })
    .eq('id', messageId);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  revalidatePath(`/admin/submissions/${submissionId}`);
  return { ok: true };
}

export async function createAndAttachMessage(
  messageId: string,
  payload: { name: string; email: string; whats_broken?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized.' };
  }
  const name = payload.name?.trim();
  const email = payload.email?.trim().toLowerCase();
  if (!messageId || !name || !email) {
    return { error: 'messageId, name, and email are required.' };
  }
  const whatsBroken =
    payload.whats_broken?.trim() && payload.whats_broken.trim().length > 0
      ? payload.whats_broken.trim()
      : 'Imported from email';

  // Use admin client so the new submission insert bypasses the SELECT-on-insert
  // RLS issue we hit in Phase 2.
  const admin = createAdminClient();
  const { data: created, error: insertError } = await admin
    .from('submissions')
    .insert({
      name,
      email,
      whats_broken: whatsBroken,
      status: 'new',
    })
    .select('id')
    .single();
  if (insertError || !created) {
    return { error: insertError?.message ?? 'Submission insert failed.' };
  }

  const { error: updateError } = await supabase
    .from('messages')
    .update({ submission_id: created.id, status: 'attached' })
    .eq('id', messageId);
  if (updateError) return { error: updateError.message };

  revalidatePath('/admin');
  revalidatePath(`/admin/submissions/${created.id}`);
  return { ok: true, submission_id: created.id };
}

export async function markMessageRead(messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized.' };
  }
  if (!messageId) return { error: 'messageId required.' };
  // Idempotent: only updates if currently unread.
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)
    .is('read_at', null);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function dismissMessage(messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Unauthorized.' };
  }
  if (!messageId) return { error: 'messageId required.' };
  const { error } = await supabase
    .from('messages')
    .update({ status: 'archived' })
    .eq('id', messageId);
  if (error) return { error: error.message };
  revalidatePath('/admin');
  return { ok: true };
}

export async function updateNotes(id: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('submissions')
    .update({ notes })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/submissions/${id}`);
  return { ok: true };
}

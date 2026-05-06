'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const;
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

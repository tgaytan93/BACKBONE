import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production.' }, { status: 403 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('gmail_sync_state')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'No sync state row.' }, { status: 404 });
  }
  const { error: updateError } = await admin
    .from('gmail_sync_state')
    .update({ last_history_id: null })
    .eq('id', data.id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: 'Watermark cleared. Next sync will backfill.' });
}

export async function GET() {
  return POST();
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type ContactPayload = {
  name?: unknown;
  business?: unknown;
  whats_broken?: unknown;
  tier?: unknown;
  budget?: unknown;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  let payload: ContactPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const name = asTrimmedString(payload.name);
  const whatsBroken = asTrimmedString(payload.whats_broken);

  if (!name || !whatsBroken) {
    return NextResponse.json(
      { error: 'Name and what is not working are required.' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from('submissions').insert({
    name,
    business: asTrimmedString(payload.business),
    whats_broken: whatsBroken,
    tier: asTrimmedString(payload.tier),
    budget: asTrimmedString(payload.budget),
  });

  if (error) {
    console.error('contact insert failed', error);
    return NextResponse.json({ error: 'Failed to save submission.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

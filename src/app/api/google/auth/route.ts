import { NextResponse } from 'next/server';
import { createOAuthClientForConsent, GMAIL_SCOPES } from '@/lib/google/oauth';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production.' }, { status: 403 });
  }

  try {
    const client = createOAuthClientForConsent();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GMAIL_SCOPES,
    });
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Setup error.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

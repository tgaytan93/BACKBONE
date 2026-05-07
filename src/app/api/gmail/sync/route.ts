import { NextResponse } from 'next/server';
import { syncGmail } from '@/lib/gmail/poll';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization');
  if (!header) return false;
  return header === `Bearer ${secret}`;
}

async function handle(request: Request): Promise<Response> {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const result = await syncGmail();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync failed.';
    console.error('[gmail/sync] failed', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

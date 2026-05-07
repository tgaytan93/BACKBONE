import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resend, appendSignature } from '@/lib/resend/client';

type ContactPayload = {
  name?: unknown;
  email?: unknown;
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

function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first && first.length > 0 ? first : 'there';
}

const AUTO_REPLY_FROM = 'Tyler Gaytan <tyler@backbonemade.com>';
const AUTO_REPLY_FROM_ADDRESS = 'tyler@backbonemade.com';
const AUTO_REPLY_REPLY_TO = 'tyler@backbonemade.com';
const AUTO_REPLY_SUBJECT = 'Tyler from Backbone';

function buildAutoReplyBody(name: string): string {
  const greeting = firstName(name);
  const intro = `Hey ${greeting},

Just confirming I received your submission. I read every one personally and I'll get back to you within 48 hours.

This is the only auto-reply you'll ever get from me.`;
  return appendSignature(intro);
}

export async function POST(request: Request) {
  let payload: ContactPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const name = asTrimmedString(payload.name);
  const email = asTrimmedString(payload.email);
  const whatsBroken = asTrimmedString(payload.whats_broken);

  if (!name || !email || !whatsBroken) {
    return NextResponse.json(
      { error: 'Name, email, and what is not working are required.' },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from('submissions')
    .insert({
      name,
      email,
      business: asTrimmedString(payload.business),
      whats_broken: whatsBroken,
      tier: asTrimmedString(payload.tier),
      budget: asTrimmedString(payload.budget),
    })
    .select('id')
    .single();

  if (error || !inserted) {
    console.error('contact insert failed', error);
    return NextResponse.json({ error: 'Failed to save submission.' }, { status: 500 });
  }

  const submissionId = inserted.id as string;
  const replyBody = buildAutoReplyBody(name);

  try {
    const sendResult = await resend.emails.send({
      from: AUTO_REPLY_FROM,
      to: email,
      replyTo: AUTO_REPLY_REPLY_TO,
      subject: AUTO_REPLY_SUBJECT,
      text: replyBody,
    });

    if (sendResult.error) {
      console.error('auto-reply send failed', sendResult.error);
    } else {
      const { error: logError } = await admin.from('messages').insert({
        submission_id: submissionId,
        direction: 'outbound',
        subject: AUTO_REPLY_SUBJECT,
        body: replyBody,
        from_address: AUTO_REPLY_FROM_ADDRESS,
        to_address: email,
        is_auto_reply: true,
        resend_id: sendResult.data?.id ?? null,
      });
      if (logError) {
        console.error('auto-reply log failed', logError);
      }
    }
  } catch (err) {
    console.error('auto-reply unexpected error', err);
  }

  return NextResponse.json({ ok: true });
}

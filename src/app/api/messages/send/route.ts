import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { resend, appendSignature, bodyHasSignature } from '@/lib/resend/client';

type SendPayload = {
  submission_id?: unknown;
  subject?: unknown;
  body?: unknown;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const REPLY_FROM = 'Tyler Gaytan <tyler@backbonemade.com>';
const REPLY_FROM_ADDRESS = 'tyler@backbonemade.com';
const REPLY_REPLY_TO = 'tyler@backbonemade.com';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let payload: SendPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const submissionId = asTrimmedString(payload.submission_id);
  const subject = asTrimmedString(payload.subject);
  const rawBody = typeof payload.body === 'string' ? payload.body : '';

  if (!submissionId) {
    return NextResponse.json({ error: 'submission_id is required.' }, { status: 400 });
  }
  if (rawBody.trim().length === 0) {
    return NextResponse.json({ error: 'Body cannot be empty.' }, { status: 400 });
  }

  const { data: submission, error: lookupError } = await supabase
    .from('submissions')
    .select('id, email, status')
    .eq('id', submissionId)
    .single();

  if (lookupError || !submission) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  }
  if (!submission.email) {
    return NextResponse.json(
      { error: 'Submission has no email on file.' },
      { status: 400 }
    );
  }

  const finalBody = bodyHasSignature(rawBody) ? rawBody : appendSignature(rawBody);
  const finalSubject = subject ?? 'Re: Tyler from Backbone';
  const toAddress = submission.email as string;

  let resendId: string | null = null;
  try {
    const sendResult = await resend.emails.send({
      from: REPLY_FROM,
      to: toAddress,
      replyTo: REPLY_REPLY_TO,
      subject: finalSubject,
      text: finalBody,
    });
    if (sendResult.error) {
      console.error('reply send failed', sendResult.error);
      return NextResponse.json(
        { error: 'Email send failed.' },
        { status: 500 }
      );
    }
    resendId = sendResult.data?.id ?? null;
  } catch (err) {
    console.error('reply send unexpected error', err);
    return NextResponse.json({ error: 'Email send failed.' }, { status: 500 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('messages')
    .insert({
      submission_id: submissionId,
      direction: 'outbound',
      subject: finalSubject,
      body: finalBody,
      from_address: REPLY_FROM_ADDRESS,
      to_address: toAddress,
      is_auto_reply: false,
      resend_id: resendId,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    console.error('reply log failed', insertError);
    return NextResponse.json(
      { error: 'Email sent but failed to log.' },
      { status: 500 }
    );
  }

  // Auto-transition submission status: a manual outbound send moves
  // 'new' or 'needs_response' to 'contacted'. Later states are left alone.
  const currentStatus = submission.status as string | null;
  if (currentStatus === 'new' || currentStatus === 'needs_response') {
    const { error: statusError } = await supabase
      .from('submissions')
      .update({ status: 'contacted' })
      .eq('id', submissionId)
      .in('status', ['new', 'needs_response']);
    if (statusError) {
      console.error('status transition to contacted failed', statusError);
    } else {
      revalidatePath('/admin');
      revalidatePath(`/admin/submissions/${submissionId}`);
    }
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}

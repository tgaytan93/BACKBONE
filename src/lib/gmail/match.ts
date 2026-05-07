import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// =============================================================================
// FILTER RULES
// Edit these lists to tune what gets dropped during ingestion. Conservative
// bias: prefer letting borderline mail through to the UNMATCHED triage queue.
// =============================================================================

// Local-part patterns that imply automation regardless of domain.
const FILTER_NOREPLY_LOCAL_PARTS = [
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'mailer-daemon', // bounces
  'postmaster', // server-level replies
];

// Whole domain blocks. Only domains with effectively zero legit human-to-business
// volume reaching tyler@backbonemade.com.
const FILTER_DOMAINS = [
  'google.com',
  'googleapis.com',
  'accounts.google.com',
  'supabase.io',
  'supabase.co',
  'resend.com',
  'resend.dev',
];

// Specific local@domain combos. Use this for platforms that send legit human
// mail too (so the whole domain can't be blocked) but have known automated
// mailboxes worth filtering.
const FILTER_AUTOMATED_MAILBOXES = [
  // Stripe
  'support@stripe.com',
  'billing@stripe.com',
  'receipts@stripe.com',
  // PayPal
  'service@paypal.com',
  'service@intl.paypal.com',
  // Amazon
  'auto-confirm@amazon.com',
  'order-update@amazon.com',
  // GitHub
  'noreply@github.com',
  'notifications@github.com',
  // Vercel
  'noreply@vercel.com',
  'no-reply@vercel.com',
  // Cloudflare
  'noreply@cloudflare.com',
  'no-reply@cloudflare.com',
  // GoDaddy
  'noreply@godaddy.com',
  'info@godaddy.com',
  // Namecheap
  'support@namecheap.com',
];

// Subject regex. Conservative: only filter when the subject is unambiguously noise.
const FILTER_SUBJECT_PATTERNS: RegExp[] = [
  /\byour receipt\b/i,
  /\bbilling alert\b/i,
  /\bsecurity alert from\b/i,
  /\bunsubscribe\b/i,
];

// =============================================================================

export type ParsedInboundMessage = {
  gmail_message_id: string;
  gmail_thread_id: string | null;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  body: string;
  sent_at: string;
};

export type MatchOutcome =
  | { kind: 'inserted_attached'; message_id: string; submission_id: string }
  | { kind: 'inserted_unmatched'; message_id: string }
  | { kind: 'duplicate' }
  | { kind: 'filtered'; reason: string }
  | { kind: 'skipped'; reason: string };

const ANGLE_RE = /<([^>]+)>/;
const EMAIL_RE = /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/;
const NAME_RE = /^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/;

export function extractEmail(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const angle = headerValue.match(ANGLE_RE);
  if (angle?.[1]) return angle[1].trim().toLowerCase();
  const bare = headerValue.match(EMAIL_RE);
  if (bare?.[0]) return bare[0].trim().toLowerCase();
  return null;
}

export function extractName(headerValue: string | null | undefined): string | null {
  if (!headerValue) return null;
  const m = headerValue.match(NAME_RE);
  if (!m) return null;
  const cleaned = m[1].trim();
  return cleaned.length > 0 ? cleaned : null;
}

function classifyFilter(
  fromEmail: string,
  subject: string | null
): { filtered: true; reason: string } | { filtered: false } {
  const at = fromEmail.lastIndexOf('@');
  if (at === -1) return { filtered: false };
  const localPart = fromEmail.slice(0, at);
  const domain = fromEmail.slice(at + 1);

  if (FILTER_NOREPLY_LOCAL_PARTS.some((p) => localPart === p || localPart.startsWith(`${p}+`))) {
    return { filtered: true, reason: `noreply_local_part:${localPart}` };
  }

  if (FILTER_DOMAINS.includes(domain)) {
    return { filtered: true, reason: `automated_domain:${domain}` };
  }

  if (FILTER_AUTOMATED_MAILBOXES.includes(fromEmail)) {
    return { filtered: true, reason: `automated_mailbox:${fromEmail}` };
  }

  if (subject) {
    for (const re of FILTER_SUBJECT_PATTERNS) {
      if (re.test(subject)) {
        return { filtered: true, reason: `subject_pattern:${re.source}` };
      }
    }
  }

  return { filtered: false };
}

export async function matchAndInsert(
  parsed: ParsedInboundMessage,
  orgId: string
): Promise<MatchOutcome> {
  const fromEmail = parsed.from_email.toLowerCase();

  const filterCheck = classifyFilter(fromEmail, parsed.subject);
  if (filterCheck.filtered) {
    console.log(
      `[gmail/match] filtered ${fromEmail} reason=${filterCheck.reason}`
    );
    return { kind: 'filtered', reason: filterCheck.reason };
  }

  const admin = createAdminClient();

  // Scope match lookup to the org we're syncing. If multiple submissions in
  // this org share an email, prefer the most recent one.
  const { data: submission, error: lookupError } = await admin
    .from('submissions')
    .select('id')
    .eq('org_id', orgId)
    .ilike('email', fromEmail)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error('[gmail/match] submission lookup error', lookupError);
    return { kind: 'skipped', reason: 'lookup_error' };
  }

  const matched = !!submission;
  const status: 'attached' | 'unmatched' = matched ? 'attached' : 'unmatched';
  const submissionId = matched ? submission.id : null;

  if (matched) {
    console.log(
      `[gmail/match] matched ${fromEmail} -> submission ${submission.id}`
    );
  } else {
    console.log(`[gmail/match] unmatched ${fromEmail}, queued for triage`);
  }

  const { data: inserted, error: insertError } = await admin
    .from('messages')
    .upsert(
      {
        org_id: orgId,
        submission_id: submissionId,
        direction: 'inbound',
        status,
        subject: parsed.subject,
        body: parsed.body,
        from_address: fromEmail,
        from_name: parsed.from_name,
        to_address: parsed.to_email,
        sent_at: parsed.sent_at,
        gmail_message_id: parsed.gmail_message_id,
        gmail_thread_id: parsed.gmail_thread_id,
        is_auto_reply: false,
      },
      { onConflict: 'gmail_message_id', ignoreDuplicates: true }
    )
    .select('id')
    .maybeSingle();

  if (insertError) {
    console.error('[gmail/match] insert error', insertError);
    return { kind: 'skipped', reason: 'insert_error' };
  }

  if (!inserted) {
    console.log(
      `[gmail/match] duplicate ${parsed.gmail_message_id}, already in messages`
    );
    return { kind: 'duplicate' };
  }

  if (matched) {
    console.log(
      `[gmail/match] inserted attached message ${inserted.id} on submission ${submissionId}`
    );
    return {
      kind: 'inserted_attached',
      message_id: inserted.id,
      submission_id: submissionId as string,
    };
  } else {
    console.log(
      `[gmail/match] inserted unmatched message ${inserted.id}`
    );
    return { kind: 'inserted_unmatched', message_id: inserted.id };
  }
}

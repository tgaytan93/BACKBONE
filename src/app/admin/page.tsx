import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminNav from './admin-nav';
import DashboardLive from './dashboard-live';
import type {
  Submission,
  RecentInbound,
  UnmatchedMessage,
} from './dashboard-types';

export const metadata = {
  title: 'Backbone — Admin',
};

export const dynamic = 'force-dynamic';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type RawAttached = {
  id: string;
  submission_id: string;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  body: string;
  sent_at: string;
  read_at: string | null;
};

type RawUnmatched = {
  id: string;
  from_address: string;
  from_name: string | null;
  subject: string | null;
  body: string;
  sent_at: string;
};

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: submissionsData } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });

  const submissions: Submission[] = submissionsData ?? [];

  const submissionNameById = new Map<string, string>();
  for (const s of submissions) submissionNameById.set(s.id, s.name);

  const { data: attachedData } = await supabase
    .from('messages')
    .select('id, submission_id, from_address, from_name, subject, body, sent_at, read_at')
    .eq('direction', 'inbound')
    .eq('status', 'attached')
    .order('sent_at', { ascending: false });

  const attached: RawAttached[] = (attachedData ?? []).filter(
    (m): m is RawAttached => m.submission_id !== null
  );

  const inboundCounts: Record<string, number> = {};
  const unreadCounts: Record<string, number> = {};
  let count24h = 0;
  const cutoff = Date.now() - ONE_DAY_MS;
  for (const m of attached) {
    inboundCounts[m.submission_id] = (inboundCounts[m.submission_id] ?? 0) + 1;
    if (m.read_at === null) {
      unreadCounts[m.submission_id] = (unreadCounts[m.submission_id] ?? 0) + 1;
    }
    const t = new Date(m.sent_at).getTime();
    if (!Number.isNaN(t) && t >= cutoff) count24h++;
  }

  const recentInbound: RecentInbound[] = attached.slice(0, 10).map((m) => ({
    id: m.id,
    submission_id: m.submission_id,
    submission_name: submissionNameById.get(m.submission_id) ?? '(unknown)',
    from_address: m.from_address,
    from_name: m.from_name,
    subject: m.subject,
    body: m.body,
    sent_at: m.sent_at,
    read_at: m.read_at,
  }));

  const { data: unmatchedData } = await supabase
    .from('messages')
    .select('id, from_address, from_name, subject, body, sent_at')
    .eq('direction', 'inbound')
    .eq('status', 'unmatched')
    .order('sent_at', { ascending: false });

  const unmatched: UnmatchedMessage[] = (unmatchedData ?? []) as RawUnmatched[];

  return (
    <div className="bg-black text-white min-h-screen">
      <AdminNav email={user.email ?? ''} />
      <DashboardLive
        initialSubmissions={submissions}
        initialRecentInbound={recentInbound}
        initialInboundCounts={inboundCounts}
        initialUnreadCounts={unreadCounts}
        initial24hCount={count24h}
        initialUnmatched={unmatched}
      />
    </div>
  );
}

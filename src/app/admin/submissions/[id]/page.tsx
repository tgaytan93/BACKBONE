import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AdminNav from '@/app/admin/admin-nav';
import StatusButtons from './status-buttons';
import NotesEditor from './notes-editor';
import { type Status } from '@/app/admin/status-pill';

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const metadata = {
  title: 'Backbone — Submission',
};

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: submission, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !submission) {
    notFound();
  }

  const specs: Array<[string, string]> = [
    ['NAME', submission.name],
    ['BUSINESS', submission.business || '—'],
    ['TIER', submission.tier || '—'],
    ['BUDGET', submission.budget || '—'],
    ['RECEIVED', DATE_FORMAT.format(new Date(submission.created_at))],
  ];

  return (
    <div className="bg-black text-white min-h-screen">
      <AdminNav email={user.email ?? ''} />

      <section className="px-6 md:px-12 pt-10 pb-16 max-w-4xl mx-auto">
        <Link
          href="/admin"
          className="inline-block text-xs tracking-widest font-mono text-white/40 hover:text-cyan-400 transition mb-8"
        >
          ← ALL SUBMISSIONS
        </Link>

        <div className="text-xs tracking-[0.3em] text-cyan-400 mb-3 font-mono">SUBMISSION</div>
        <h1 className="text-3xl md:text-4xl font-black leading-tight mb-2">
          {submission.name}
        </h1>
        <p className="text-white/60 text-sm mb-10">
          {submission.business || 'No business listed'} ·{' '}
          <span className="font-mono tracking-widest text-white/40">
            {DATE_FORMAT.format(new Date(submission.created_at))}
          </span>
        </p>

        <div className="border border-white/10 bg-zinc-950 p-6 mb-10">
          <div className="text-xs tracking-[0.25em] text-white/40 mb-4 font-mono">INQUIRY</div>
          <div className="space-y-3 mb-6">
            {specs.map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col md:flex-row md:justify-between md:items-baseline gap-1 text-sm font-mono border-b border-white/5 pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-white/40 tracking-widest text-xs">{label}</span>
                <span className="text-white/90 md:text-right">{value}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-5">
            <div className="text-xs tracking-widest text-white/40 mb-3 font-mono">WHAT&apos;S NOT WORKING</div>
            <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap">
              {submission.whats_broken || '—'}
            </p>
          </div>
        </div>

        <div className="mb-10">
          <div className="text-xs tracking-[0.25em] text-white/40 mb-4 font-mono">STATUS</div>
          <StatusButtons
            id={submission.id}
            initialStatus={(submission.status ?? 'new') as Status}
          />
        </div>

        <div>
          <div className="text-xs tracking-[0.25em] text-white/40 mb-4 font-mono">NOTES</div>
          <NotesEditor id={submission.id} initialNotes={submission.notes ?? ''} />
        </div>
      </section>
    </div>
  );
}

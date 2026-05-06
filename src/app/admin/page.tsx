import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AdminNav from './admin-nav';
import StatusPill from './status-pill';

type Submission = {
  id: string;
  created_at: string;
  name: string;
  business: string | null;
  whats_broken: string | null;
  tier: string | null;
  budget: string | null;
  status: string | null;
  notes: string | null;
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(value: string) {
  return DATE_FORMAT.format(new Date(value));
}

export const metadata = {
  title: 'Backbone — Admin',
};

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false });

  const rows: Submission[] = submissions ?? [];

  const counts = {
    total: rows.length,
    new: rows.filter((r) => r.status === 'new').length,
    contacted: rows.filter((r) => r.status === 'contacted').length,
    won: rows.filter((r) => r.status === 'won').length,
  };

  return (
    <div className="bg-black text-white min-h-screen">
      <AdminNav email={user.email ?? ''} />

      <section className="px-6 md:px-12 pt-10 pb-6 max-w-7xl mx-auto">
        <div className="text-xs tracking-[0.3em] text-cyan-400 mb-3 font-mono">SUBMISSIONS</div>
        <h1 className="text-3xl md:text-4xl font-black leading-tight mb-8">
          Inbound from the site.
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border-2 border-white">
          {[
            { label: 'TOTAL', value: counts.total },
            { label: 'NEW', value: counts.new },
            { label: 'CONTACTED', value: counts.contacted },
            { label: 'WON', value: counts.won },
          ].map((stat) => (
            <div key={stat.label} className="bg-black px-5 py-4">
              <div className="text-xs text-white/40 mb-1.5 tracking-widest font-mono">{stat.label}</div>
              <div className="text-xl md:text-2xl font-bold tabular-nums">
                {String(stat.value).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 pb-20 max-w-7xl mx-auto">
        {rows.length === 0 ? (
          <div className="border border-white/10 bg-zinc-950 px-6 py-16 text-center">
            <p className="text-white/40 text-base">No submissions yet. Share your site.</p>
          </div>
        ) : (
          <div className="border border-white/10">
            <div className="hidden md:grid grid-cols-[140px_1fr_1fr_140px_140px_120px] gap-4 px-5 py-3 border-b border-white/10 bg-zinc-950 text-xs tracking-widest font-mono text-white/40">
              <div>RECEIVED</div>
              <div>NAME</div>
              <div>BUSINESS</div>
              <div>TIER</div>
              <div>BUDGET</div>
              <div>STATUS</div>
            </div>
            <ul>
              {rows.map((row) => (
                <li key={row.id} className="border-b border-white/5 last:border-b-0">
                  <Link
                    href={`/admin/submissions/${row.id}`}
                    className="grid md:grid-cols-[140px_1fr_1fr_140px_140px_120px] gap-2 md:gap-4 px-5 py-4 hover:bg-zinc-950 transition"
                  >
                    <div className="text-xs font-mono text-white/50 tracking-widest">
                      {formatDate(row.created_at).toUpperCase()}
                    </div>
                    <div className="text-sm font-bold truncate">{row.name}</div>
                    <div className="text-sm text-white/70 truncate">{row.business || '—'}</div>
                    <div className="text-xs font-mono text-white/60 truncate">{row.tier || '—'}</div>
                    <div className="text-xs font-mono text-white/60 truncate">{row.budget || '—'}</div>
                    <div>
                      <StatusPill status={row.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

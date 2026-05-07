'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import SyncButton from './submissions/[id]/sync-button';
import RecoverButton from './recover-button';
import StatusPill from './status-pill';
import UnmatchedRow from './unmatched-row';
import type {
  Submission,
  RecentInbound,
  UnmatchedMessage,
} from './dashboard-types';
export type { Submission, RecentInbound, UnmatchedMessage };

type RawMessage = {
  id: string;
  submission_id: string | null;
  direction: 'inbound' | 'outbound';
  status: 'attached' | 'unmatched' | 'archived' | 'spam';
  from_address: string;
  from_name: string | null;
  subject: string | null;
  body: string;
  sent_at: string;
  read_at: string | null;
};

const DATE_FORMAT_DAY = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const DATE_FORMAT_TIME = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatDay(iso: string): string {
  return DATE_FORMAT_DAY.format(new Date(iso));
}

function formatStamp(iso: string): string {
  const parts = DATE_FORMAT_TIME.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('month')} ${get('day')} · ${get('hour')}:${get('minute')} ${get('dayPeriod')}`;
}

function snippet(body: string, n = 80): string {
  const cleaned = body.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= n) return cleaned;
  return cleaned.slice(0, n) + '…';
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function DashboardLive({
  initialSubmissions,
  initialRecentInbound,
  initialInboundCounts,
  initialUnreadCounts,
  initial24hCount,
  initialUnmatched,
}: {
  initialSubmissions: Submission[];
  initialRecentInbound: RecentInbound[];
  initialInboundCounts: Record<string, number>;
  initialUnreadCounts: Record<string, number>;
  initial24hCount: number;
  initialUnmatched: UnmatchedMessage[];
}) {
  const [recentInbound, setRecentInbound] = useState<RecentInbound[]>(
    initialRecentInbound
  );
  const [inboundCounts, setInboundCounts] = useState<Record<string, number>>(
    initialInboundCounts
  );
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(
    initialUnreadCounts
  );
  const [count24h, setCount24h] = useState<number>(initial24hCount);
  const [unmatched, setUnmatched] = useState<UnmatchedMessage[]>(
    initialUnmatched
  );

  useEffect(() => {
    const supabase = createClient();

    function bumpRecent(m: RawMessage, submissionName: string) {
      setRecentInbound((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;
        const next: RecentInbound[] = [
          {
            id: m.id,
            submission_id: m.submission_id as string,
            submission_name: submissionName,
            from_address: m.from_address,
            from_name: m.from_name,
            subject: m.subject,
            body: m.body,
            sent_at: m.sent_at,
            read_at: m.read_at,
          },
          ...prev,
        ];
        next.sort(
          (a, b) =>
            new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
        );
        return next.slice(0, 10);
      });
    }

    function bumpInboundCount(submissionId: string) {
      setInboundCounts((prev) => ({
        ...prev,
        [submissionId]: (prev[submissionId] ?? 0) + 1,
      }));
    }

    function bumpUnreadCount(submissionId: string) {
      setUnreadCounts((prev) => ({
        ...prev,
        [submissionId]: (prev[submissionId] ?? 0) + 1,
      }));
    }

    function decrementUnreadCount(submissionId: string) {
      setUnreadCounts((prev) => {
        const cur = prev[submissionId] ?? 0;
        if (cur <= 0) return prev;
        return { ...prev, [submissionId]: cur - 1 };
      });
    }

    function bump24h(sentAt: string) {
      const t = new Date(sentAt).getTime();
      if (!Number.isNaN(t) && Date.now() - t <= ONE_DAY_MS) {
        setCount24h((c) => c + 1);
      }
    }

    function pushUnmatched(m: RawMessage) {
      setUnmatched((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;
        const next: UnmatchedMessage[] = [
          {
            id: m.id,
            from_address: m.from_address,
            from_name: m.from_name,
            subject: m.subject,
            body: m.body,
            sent_at: m.sent_at,
          },
          ...prev,
        ];
        next.sort(
          (a, b) =>
            new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
        );
        return next;
      });
    }

    console.log('[dashboard] subscribing to messages channel');

    const channel = supabase
      .channel('admin-dashboard-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: 'direction=eq.inbound',
        },
        (payload) => {
          console.log(
            `[dashboard] realtime event ${payload.eventType}`,
            payload.new
          );

          if (payload.eventType === 'INSERT') {
            const m = payload.new as RawMessage;
            if (m.status === 'attached' && m.submission_id) {
              console.log(
                `[dashboard] insert attached ${m.id} -> submission ${m.submission_id}`
              );
              const sub = initialSubmissions.find(
                (s) => s.id === m.submission_id
              );
              bumpRecent(m, sub?.name ?? '(unknown)');
              bumpInboundCount(m.submission_id);
              if (m.read_at === null) bumpUnreadCount(m.submission_id);
              bump24h(m.sent_at);
            } else if (m.status === 'unmatched') {
              console.log(`[dashboard] insert unmatched ${m.id}`);
              pushUnmatched(m);
            }
            return;
          }

          if (payload.eventType === 'UPDATE') {
            const newM = payload.new as RawMessage;

            // unmatched -> attached: triage
            if (newM.status === 'attached' && newM.submission_id) {
              setUnmatched((prev) => {
                const wasUnmatched = prev.some((x) => x.id === newM.id);
                if (wasUnmatched) {
                  console.log(
                    `[dashboard] update unmatched -> attached ${newM.id} (submission ${newM.submission_id})`
                  );
                  const sub = initialSubmissions.find(
                    (s) => s.id === newM.submission_id
                  );
                  bumpRecent(newM, sub?.name ?? '(unknown)');
                  bumpInboundCount(newM.submission_id as string);
                  if (newM.read_at === null) {
                    bumpUnreadCount(newM.submission_id as string);
                  }
                  bump24h(newM.sent_at);
                  return prev.filter((x) => x.id !== newM.id);
                }
                return prev;
              });
            } else if (newM.status === 'archived') {
              setUnmatched((prev) => {
                const wasUnmatched = prev.some((x) => x.id === newM.id);
                if (wasUnmatched) {
                  console.log(
                    `[dashboard] update unmatched -> archived ${newM.id}`
                  );
                  return prev.filter((x) => x.id !== newM.id);
                }
                return prev;
              });
            }

            // read_at: null -> non-null (mark read). Independent of status changes.
            if (
              newM.status === 'attached' &&
              newM.submission_id &&
              newM.read_at !== null
            ) {
              setRecentInbound((prev) => {
                const idx = prev.findIndex((x) => x.id === newM.id);
                if (idx === -1) return prev;
                const wasUnread = prev[idx].read_at === null;
                if (!wasUnread) return prev;
                console.log(
                  `[dashboard] message marked read ${newM.id} (submission ${newM.submission_id})`
                );
                const next = [...prev];
                next[idx] = { ...next[idx], read_at: newM.read_at };
                decrementUnreadCount(newM.submission_id as string);
                return next;
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[dashboard] channel status: ${status}`);
      });

    return () => {
      console.log('[dashboard] unsubscribing messages channel');
      supabase.removeChannel(channel);
    };
  }, [initialSubmissions]);

  const counts = {
    total: initialSubmissions.length,
    new: initialSubmissions.filter((r) => r.status === 'new').length,
    contacted: initialSubmissions.filter((r) => r.status === 'contacted').length,
    won: initialSubmissions.filter((r) => r.status === 'won').length,
  };

  const tiles = [
    { label: 'TOTAL', value: counts.total, accent: false },
    { label: 'NEW', value: counts.new, accent: false },
    { label: 'CONTACTED', value: counts.contacted, accent: false },
    { label: 'WON', value: counts.won, accent: false },
    { label: 'INBOUND (24H)', value: count24h, accent: count24h > 0 },
  ];

  return (
    <>
      <section className="px-6 md:px-12 pt-10 pb-6 max-w-7xl mx-auto">
        <div className="text-xs tracking-[0.3em] text-cyan-400 mb-3 font-mono">
          SUBMISSIONS
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <h1 className="text-3xl md:text-4xl font-black leading-tight">
            Inbound from the site.
          </h1>
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <RecoverButton />
            <SyncButton />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-white/10 border-2 border-white">
          {tiles.map((stat) => (
            <div
              key={stat.label}
              className={`bg-black px-5 py-4 ${
                stat.accent ? 'border border-cyan-400/70' : ''
              }`}
            >
              <div
                className={`text-xs mb-1.5 tracking-widest font-mono ${
                  stat.accent ? 'text-cyan-400' : 'text-white/40'
                }`}
              >
                {stat.label}
              </div>
              <div
                className={`text-xl md:text-2xl font-bold tabular-nums ${
                  stat.accent ? 'text-cyan-400' : ''
                }`}
              >
                {String(stat.value).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>
      </section>

      {unmatched.length > 0 && (
        <section className="px-6 md:px-12 pb-10 max-w-7xl mx-auto">
          <div className="flex items-baseline gap-3 mb-4">
            <div className="text-xs tracking-[0.25em] text-white/40 font-mono">
              UNMATCHED
            </div>
            <div className="text-xs tracking-[0.25em] text-cyan-400 font-mono tabular-nums">
              {String(unmatched.length).padStart(2, '0')}
            </div>
          </div>
          <ul className="space-y-3">
            {unmatched.map((m) => (
              <UnmatchedRow
                key={m.id}
                message={m}
                submissions={initialSubmissions}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="px-6 md:px-12 pb-10 max-w-7xl mx-auto">
        <div className="text-xs tracking-[0.25em] text-white/40 mb-4 font-mono">
          RECENT INBOUND
        </div>
        {recentInbound.length === 0 ? (
          <div className="border border-white/10 bg-zinc-950 px-5 py-10 text-center">
            <p className="text-white/40 text-sm">
              No inbound yet. SYNC INBOX to pull replies.
            </p>
          </div>
        ) : (
          <div className="border border-white/10">
            <ul>
              {recentInbound.map((m) => {
                const isUnread = m.read_at === null;
                const stampCls = isUnread
                  ? 'text-white/60'
                  : 'text-white/30';
                const nameCls = isUnread
                  ? 'text-white font-bold'
                  : 'text-white/50 font-normal';
                const fromCls = isUnread
                  ? 'text-white/70'
                  : 'text-white/40';
                const subjectCls = isUnread
                  ? 'text-white'
                  : 'text-white/50';
                const snippetCls = isUnread
                  ? 'text-white/60'
                  : 'text-white/35';
                return (
                  <li
                    key={m.id}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <Link
                      href={`/admin/submissions/${m.submission_id}`}
                      className="grid md:grid-cols-[160px_1fr_2fr] gap-2 md:gap-4 px-5 py-4 hover:bg-zinc-950 transition"
                    >
                      <div
                        className={`text-xs font-mono tracking-widest uppercase ${stampCls}`}
                      >
                        {formatStamp(m.sent_at)}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-sm truncate ${nameCls}`}>
                          {m.submission_name}
                        </div>
                        <div className={`text-xs truncate font-mono ${fromCls}`}>
                          {m.from_address}
                        </div>
                      </div>
                      <div className="min-w-0">
                        {m.subject && (
                          <div className={`text-sm truncate ${subjectCls}`}>
                            {m.subject}
                          </div>
                        )}
                        <div className={`text-xs truncate ${snippetCls}`}>
                          {snippet(m.body)}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="px-6 md:px-12 pb-20 max-w-7xl mx-auto">
        {initialSubmissions.length === 0 ? (
          <div className="border border-white/10 bg-zinc-950 px-6 py-16 text-center">
            <p className="text-white/40 text-base">
              No submissions yet. Share your site.
            </p>
          </div>
        ) : (
          <div className="border border-white/10">
            <div className="hidden md:grid grid-cols-[140px_1fr_1fr_120px_120px_100px_100px] gap-4 px-5 py-3 border-b border-white/10 bg-zinc-950 text-xs tracking-widest font-mono text-white/40">
              <div>RECEIVED</div>
              <div>NAME</div>
              <div>BUSINESS</div>
              <div>TIER</div>
              <div>BUDGET</div>
              <div>INBOUND</div>
              <div>STATUS</div>
            </div>
            <ul>
              {initialSubmissions.map((row) => {
                const inboundCount = inboundCounts[row.id] ?? 0;
                const unreadCount = unreadCounts[row.id] ?? 0;
                const hasUnread = unreadCount > 0;
                return (
                  <li
                    key={row.id}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <Link
                      href={`/admin/submissions/${row.id}`}
                      className="grid md:grid-cols-[140px_1fr_1fr_120px_120px_100px_100px] gap-2 md:gap-4 px-5 py-4 hover:bg-zinc-950 transition"
                    >
                      <div className="text-xs font-mono text-white/50 tracking-widest">
                        {formatDay(row.created_at).toUpperCase()}
                      </div>
                      <div className="text-sm font-bold truncate">
                        {row.name}
                      </div>
                      <div className="text-sm text-white/70 truncate">
                        {row.business || '—'}
                      </div>
                      <div className="text-xs font-mono text-white/60 truncate">
                        {row.tier || '—'}
                      </div>
                      <div className="text-xs font-mono text-white/60 truncate">
                        {row.budget || '—'}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasUnread && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        )}
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            hasUnread ? 'text-cyan-400' : 'text-white/40'
                          }`}
                        >
                          {String(inboundCount).padStart(2, '0')}
                        </span>
                      </div>
                      <div>
                        <StatusPill status={row.status} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  attachMessage,
  createAndAttachMessage,
  dismissMessage,
} from './actions';
import type { Submission, UnmatchedMessage } from './dashboard-types';

const STAMP_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatStamp(iso: string): string {
  const parts = STAMP_FORMAT.formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('month')} ${get('day')} · ${get('hour')}:${get('minute')} ${get('dayPeriod')}`;
}

function snippet(body: string, n = 120): string {
  const cleaned = body.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= n) return cleaned;
  return cleaned.slice(0, n) + '…';
}

function defaultName(m: UnmatchedMessage): string {
  if (m.from_name) return m.from_name;
  const at = m.from_address.indexOf('@');
  if (at > 0) return m.from_address.slice(0, at);
  return '';
}

type Mode = 'idle' | 'attach' | 'create' | 'confirm-dismiss';
type MoreState = 'closed' | 'open';

export default function UnmatchedRow({
  message,
  submissions,
}: {
  message: UnmatchedMessage;
  submissions: Submission[];
}) {
  const [mode, setMode] = useState<Mode>('idle');
  const [moreState, setMoreState] = useState<MoreState>('closed');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  // Attach state
  const [attachQuery, setAttachQuery] = useState('');

  // Create state
  const [name, setName] = useState(defaultName(message));
  const [email, setEmail] = useState(message.from_address);
  const [whatsBroken, setWhatsBroken] = useState('Imported from email');

  const filtered = useMemo(() => {
    const q = attachQuery.trim().toLowerCase();
    if (!q) return submissions.slice(0, 20);
    return submissions
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.email ?? '').toLowerCase().includes(q) ||
          (s.business ?? '').toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [attachQuery, submissions]);

  function close() {
    setMode('idle');
    setError('');
  }

  function runAttach(submissionId: string) {
    if (isPending) return;
    setError('');
    startTransition(async () => {
      const res = await attachMessage(message.id, submissionId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      // Realtime UPDATE event will remove this row from the list.
    });
  }

  function runCreate(e: React.FormEvent) {
    e.preventDefault();
    if (isPending) return;
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setError('');
    startTransition(async () => {
      const res = await createAndAttachMessage(message.id, {
        name: name.trim(),
        email: email.trim(),
        whats_broken: whatsBroken.trim(),
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
    });
  }

  function runDismiss() {
    if (isPending) return;
    setError('');
    startTransition(async () => {
      const res = await dismissMessage(message.id);
      if (res?.error) {
        setError(res.error);
        return;
      }
    });
  }

  return (
    <li className="border border-white/10 bg-zinc-950 border-l-2 border-l-cyan-400/70">
      <div className="px-5 py-4">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-xs font-mono text-white/50 tracking-widest uppercase">
              {formatStamp(message.sent_at)}
            </span>
            <span className="text-sm font-bold">
              {message.from_name || message.from_address}
            </span>
            {message.from_name && (
              <span className="text-xs font-mono text-white/50">
                {message.from_address}
              </span>
            )}
          </div>
        </div>
        {message.subject && (
          <div className="text-sm text-white mb-1 truncate">
            {message.subject}
          </div>
        )}
        <div className="text-xs text-white/50">{snippet(message.body)}</div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === 'create' ? 'idle' : 'create')}
            disabled={isPending}
            className="px-4 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border border-cyan-400/60 text-cyan-400 hover:bg-cyan-400 hover:text-black transition disabled:opacity-40"
          >
            Create submission
          </button>
          <button
            type="button"
            onClick={() =>
              setMode(mode === 'confirm-dismiss' ? 'idle' : 'confirm-dismiss')
            }
            disabled={isPending}
            className="px-3 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border border-white/20 text-white/70 hover:border-red-400 hover:text-red-400 transition disabled:opacity-40"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => setMoreState(moreState === 'open' ? 'closed' : 'open')}
            disabled={isPending}
            className="ml-1 px-2 py-1 text-[10px] tracking-[0.25em] font-mono uppercase text-white/40 hover:text-white transition disabled:opacity-40"
          >
            More {moreState === 'open' ? '▴' : '▾'}
          </button>
          {moreState === 'open' && (
            <button
              type="button"
              onClick={() => setMode(mode === 'attach' ? 'idle' : 'attach')}
              disabled={isPending}
              className="px-3 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border border-white/20 text-white/70 hover:border-cyan-400 hover:text-cyan-400 transition disabled:opacity-40"
            >
              Attach to submission
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-400 font-mono">
            {error}
          </div>
        )}
      </div>

      {mode === 'attach' && (
        <div className="border-t border-white/10 px-5 py-4 bg-black">
          <label className="text-[10px] tracking-[0.25em] font-mono uppercase text-white/40 block mb-2">
            Search submissions
          </label>
          <input
            type="text"
            value={attachQuery}
            onChange={(e) => setAttachQuery(e.target.value)}
            placeholder="Name, email, or business"
            autoFocus
            className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white placeholder-white/30 mb-3"
          />
          <ul className="max-h-64 overflow-y-auto border border-white/10 divide-y divide-white/5">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-white/40 font-mono">
                No matches.
              </li>
            ) : (
              filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => runAttach(s.id)}
                    disabled={isPending}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-950 transition disabled:opacity-40"
                  >
                    <div className="text-sm font-bold truncate">{s.name}</div>
                    <div className="text-xs font-mono text-white/50 truncate">
                      {s.email ?? '(no email)'} · {s.business ?? '—'}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={close}
              className="px-3 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border border-white/10 text-white/50 hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <form
          onSubmit={runCreate}
          className="border-t border-white/10 px-5 py-4 bg-black space-y-3"
        >
          <div>
            <label className="text-[10px] tracking-[0.25em] font-mono uppercase text-white/40 block mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white"
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.25em] font-mono uppercase text-white/40 block mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white"
            />
          </div>
          <div>
            <label className="text-[10px] tracking-[0.25em] font-mono uppercase text-white/40 block mb-1">
              What&apos;s not working
            </label>
            <textarea
              rows={2}
              value={whatsBroken}
              onChange={(e) => setWhatsBroken(e.target.value)}
              className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="px-3 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border border-white/10 text-white/50 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border border-cyan-400/60 text-cyan-400 hover:bg-cyan-400 hover:text-black transition disabled:opacity-40"
            >
              {isPending ? 'Creating...' : 'Create + Attach'}
            </button>
          </div>
        </form>
      )}

      {mode === 'confirm-dismiss' && (
        <div className="border-t border-white/10 px-5 py-4 bg-black flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <span className="text-sm text-white/70">
            Mark as not business? This message will be archived.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              className="px-3 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border border-white/10 text-white/50 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={runDismiss}
              disabled={isPending}
              className="px-4 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border border-red-500/60 text-red-400 hover:bg-red-500 hover:text-black transition disabled:opacity-40"
            >
              {isPending ? 'Dismissing...' : 'Yes, dismiss'}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { triggerGmailSync } from '@/app/admin/actions';

type SyncState = 'idle' | 'syncing' | 'done' | 'error';
type Variant = 'primary' | 'secondary';

export default function SyncButton({
  submissionId,
  variant = 'primary',
}: {
  submissionId?: string;
  variant?: Variant;
}) {
  const [state, setState] = useState<SyncState>('idle');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (state === 'syncing' || isPending) return;
    setState('syncing');
    setMessage('');
    startTransition(async () => {
      const res = await triggerGmailSync(submissionId);
      if (res?.error) {
        setState('error');
        setMessage(res.error);
        return;
      }
      const r = res?.result;
      if (r) {
        const parts = [
          `MODE ${r.mode.toUpperCase()}`,
          `FOUND ${r.messages_found}`,
          `ATTACH ${r.attached}`,
          `UNMATCH ${r.unmatched}`,
          `DUPE ${r.duplicates}`,
          `FILTER ${r.filtered}`,
        ];
        setMessage(parts.join(' · '));
      } else {
        setMessage('Done.');
      }
      setState('done');
    });
  }

  const buttonCls =
    variant === 'primary'
      ? 'px-5 py-2.5 text-xs tracking-[0.25em] font-mono uppercase border border-cyan-400/60 text-cyan-400 hover:bg-cyan-400 hover:text-black transition disabled:opacity-40 disabled:cursor-not-allowed'
      : 'px-3 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border border-white/20 text-white/70 hover:border-cyan-400 hover:text-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div
      className={`flex ${
        variant === 'primary'
          ? 'flex-col md:items-end gap-2'
          : 'flex-col items-end gap-1.5'
      }`}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'syncing' || isPending}
        className={buttonCls}
      >
        {state === 'syncing' ? 'SYNCING...' : 'SYNC INBOX'}
      </button>
      {message && (
        <span
          className={`text-[10px] tracking-[0.2em] font-mono uppercase text-right ${
            state === 'error' ? 'text-red-400' : 'text-white/40'
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}

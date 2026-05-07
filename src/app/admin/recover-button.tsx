'use client';

import { useState, useTransition } from 'react';
import { recoverInbox } from './actions';

type State = 'idle' | 'running' | 'done' | 'error';

export default function RecoverButton() {
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (state === 'running' || isPending) return;
    setState('running');
    setMessage('');
    startTransition(async () => {
      const res = await recoverInbox();
      if (res?.error) {
        setState('error');
        setMessage(res.error);
        return;
      }
      const r = res?.result;
      if (r) {
        const parts = [
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

  return (
    <div className="flex flex-col md:items-end gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'running' || isPending}
        className="px-5 py-2.5 text-xs tracking-[0.25em] font-mono uppercase border border-white/20 text-white/70 hover:border-cyan-400 hover:text-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {state === 'running' ? 'RECOVERING...' : 'RECOVER UNMATCHED'}
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

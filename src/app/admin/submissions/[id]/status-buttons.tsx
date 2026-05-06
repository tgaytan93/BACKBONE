'use client';

import { useState, useTransition } from 'react';
import { updateStatus } from '@/app/admin/actions';
import { STATUSES, type Status } from '@/app/admin/status-pill';

const ACTIVE_CLS: Record<Status, string> = {
  new: 'bg-cyan-400 text-black border-cyan-400',
  contacted: 'bg-white text-black border-white',
  qualified: 'bg-yellow-400 text-black border-yellow-400',
  won: 'bg-green-400 text-black border-green-400',
  lost: 'bg-red-500/80 text-black border-red-500/80',
};

export default function StatusButtons({
  id,
  initialStatus,
}: {
  id: string;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleClick(next: Status) {
    if (next === status || isPending) return;
    setError('');
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await updateStatus(id, next);
      if (result?.error) {
        setStatus(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const isActive = s === status;
          return (
            <button
              key={s}
              type="button"
              onClick={() => handleClick(s)}
              disabled={isPending}
              className={`px-3 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border transition disabled:cursor-not-allowed ${
                isActive
                  ? ACTIVE_CLS[s]
                  : 'border-white/20 text-white/60 hover:border-cyan-400 hover:text-cyan-400'
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-3 text-xs font-mono text-red-400">{error}</p>
      )}
    </div>
  );
}

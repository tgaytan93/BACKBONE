'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';
import { updateStatus, deleteSubmission } from './actions';
import { type Status } from './status-pill';

type Mode = 'closed' | 'menu' | 'confirm-delete';

type StatusOption = {
  value: Status;
  label: string;
  cls: string;
};

const ALL_STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'needs_response',
    label: 'NEEDS RESPONSE',
    cls: 'text-orange-400',
  },
  { value: 'contacted', label: 'CONTACTED', cls: 'text-white' },
  { value: 'qualified', label: 'QUALIFIED', cls: 'text-yellow-400' },
  { value: 'won', label: 'WON', cls: 'text-green-400' },
  { value: 'lost', label: 'LOST', cls: 'text-red-400' },
];

function visibleOptions(current: string | null): StatusOption[] {
  return ALL_STATUS_OPTIONS.filter((opt) => {
    if (opt.value === current) return false; // hide current state
    if (opt.value === 'needs_response') return current === 'new';
    if (opt.value === 'contacted')
      return current === 'new' || current === 'needs_response';
    return true; // qualified, won, lost always visible
  });
}

export default function SubmissionKebab({
  submissionId,
  currentStatus,
}: {
  submissionId: string;
  currentStatus: string | null;
}) {
  const [mode, setMode] = useState<Mode>('closed');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const options = visibleOptions(currentStatus);

  // Click outside closes the menu
  useEffect(() => {
    if (mode === 'closed') return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMode('closed');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mode]);

  function runStatusUpdate(next: Status) {
    if (isPending) return;
    setError('');
    startTransition(async () => {
      const res = await updateStatus(submissionId, next);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setMode('closed');
    });
  }

  function runDelete() {
    if (isPending) return;
    setError('');
    startTransition(async () => {
      const res = await deleteSubmission(submissionId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      // Realtime DELETE event will remove the row from the dashboard.
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMode(mode === 'closed' ? 'menu' : 'closed');
        }}
        disabled={isPending}
        aria-label="Submission actions"
        className="p-1.5 text-white/40 hover:text-white transition disabled:opacity-40"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {mode === 'menu' && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-full right-0 mt-1 z-20 min-w-[200px] bg-black border border-white/10 shadow-lg"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                runStatusUpdate(opt.value);
              }}
              disabled={isPending}
              className={`block w-full text-left px-4 py-2 text-[10px] tracking-[0.25em] font-mono uppercase hover:bg-white/5 transition disabled:opacity-40 ${opt.cls}`}
            >
              {opt.label}
            </button>
          ))}
          <div className="border-t border-white/10" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMode('confirm-delete');
            }}
            disabled={isPending}
            className="flex items-center gap-2 w-full text-left px-4 py-2 text-[10px] tracking-[0.25em] font-mono uppercase text-red-400 hover:bg-white/5 transition disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete submission
          </button>
        </div>
      )}

      {mode === 'confirm-delete' && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-full right-0 mt-1 z-20 w-[320px] bg-black border border-red-500/40 shadow-lg p-4"
        >
          <p className="text-sm text-white/80 mb-3">
            Delete this submission and all its messages? This cannot be undone.
          </p>
          {error && (
            <div className="mb-3 border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-400 font-mono">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMode('menu');
              }}
              disabled={isPending}
              className="px-3 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border border-white/10 text-white/50 hover:text-white transition disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                runDelete();
              }}
              disabled={isPending}
              className="px-4 py-1.5 text-[10px] tracking-[0.25em] font-mono uppercase border border-red-500/60 text-red-400 hover:bg-red-500 hover:text-black transition disabled:opacity-40"
            >
              {isPending ? 'Deleting...' : 'Yes, delete'}
            </button>
          </div>
        </div>
      )}

      {error && mode === 'menu' && (
        <div className="absolute top-full right-0 mt-1 z-20 w-[280px] bg-black border border-red-500/40 px-3 py-2 text-xs text-red-400 font-mono">
          {error}
        </div>
      )}
    </div>
  );
}

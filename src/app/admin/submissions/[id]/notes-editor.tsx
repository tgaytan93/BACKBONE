'use client';

import { useState, useTransition } from 'react';
import { updateNotes } from '@/app/admin/actions';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function NotesEditor({
  id,
  initialNotes,
}: {
  id: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [savedValue, setSavedValue] = useState(initialNotes);
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function save() {
    if (notes === savedValue || isPending) return;
    setState('saving');
    setError('');
    startTransition(async () => {
      const result = await updateNotes(id, notes);
      if (result?.error) {
        setState('error');
        setError(result.error);
        return;
      }
      setSavedValue(notes);
      setState('saved');
    });
  }

  return (
    <div>
      <textarea
        rows={6}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          if (state !== 'idle') setState('idle');
        }}
        onBlur={save}
        placeholder="Internal notes — saved on blur."
        className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white placeholder-white/30 font-mono"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] tracking-[0.25em] font-mono uppercase text-white/40">
          {state === 'saving' && 'SAVING...'}
          {state === 'saved' && '✓ SAVED'}
          {state === 'error' && (
            <span className="text-red-400">{error || 'SAVE FAILED'}</span>
          )}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={isPending || notes === savedValue}
          className="px-4 py-2 text-[10px] tracking-[0.25em] font-mono uppercase border border-white/20 text-white/70 hover:border-cyan-400 hover:text-cyan-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Notes
        </button>
      </div>
    </div>
  );
}

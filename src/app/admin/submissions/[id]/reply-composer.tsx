'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type SendState = 'idle' | 'sending' | 'error';

export default function ReplyComposer({
  submissionId,
  recipientEmail,
}: {
  submissionId: string;
  recipientEmail: string | null;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState('Re: Got your message');
  const [body, setBody] = useState('');
  const [state, setState] = useState<SendState>('idle');
  const [error, setError] = useState('');

  const disabled = state === 'sending' || !recipientEmail;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    if (body.trim().length === 0) {
      setError('Body cannot be empty.');
      setState('error');
      return;
    }

    setState('sending');
    setError('');

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: submissionId,
          subject,
          body,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Send failed.');
      }

      setSubject('Re: Got your message');
      setBody('');
      setState('idle');
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed.';
      setError(msg);
      setState('error');
    }
  }

  if (!recipientEmail) {
    return (
      <div className="border border-white/10 bg-zinc-950 p-5 text-sm text-white/50">
        No email on file for this submission. Replies disabled.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="border border-white/10 bg-zinc-950 p-5 space-y-4">
      <div>
        <label className="text-xs tracking-widest text-white/50 block mb-2 font-mono">
          SUBJECT
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={disabled}
          className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white placeholder-white/30 disabled:opacity-50"
        />
      </div>
      <div>
        <label className="text-xs tracking-widest text-white/50 block mb-2 font-mono">
          BODY
        </label>
        <textarea
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Hey ${recipientEmail.split('@')[0]},\n\n`}
          disabled={disabled}
          className="w-full bg-transparent border border-white/20 px-3 py-2 text-sm focus:outline-none focus:border-cyan-400 transition text-white placeholder-white/30 font-mono disabled:opacity-50"
        />
      </div>

      {state === 'error' && error && (
        <div className="border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm text-red-400 font-mono">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <p className="text-xs text-white/40 font-mono tracking-wider">
          Sending from tyler@backbonemade.com  ·  Reply-to is your inbox
        </p>
        <button
          type="submit"
          disabled={disabled}
          className="bg-cyan-400 text-black px-6 py-3 text-sm font-bold tracking-widest inline-flex items-center justify-center gap-2 hover:bg-white transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {state === 'sending' ? 'SENDING...' : 'SEND →'}
        </button>
      </div>
    </form>
  );
}
